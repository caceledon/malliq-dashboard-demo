#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-sa-east-1}"
NAME="${STACK_NAME:-malliq}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"
VOLUME_SIZE_GB="${VOLUME_SIZE_GB:-30}"
KEY_NAME="${KEY_NAME:-${NAME}-key}"
SG_NAME="${SG_NAME:-${NAME}-sg}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_DATA_FILE="${SCRIPT_DIR}/user-data.sh"
KEY_FILE="${SCRIPT_DIR}/${KEY_NAME}.pem"

if command -v cygpath >/dev/null 2>&1; then
  USER_DATA_PATH_FOR_AWS="$(cygpath -m "${USER_DATA_FILE}")"
else
  USER_DATA_PATH_FOR_AWS="${USER_DATA_FILE}"
fi

echo ">> Region: ${REGION}"
echo ">> Stack name: ${NAME}"

aws ec2 describe-regions --region "${REGION}" --region-names "${REGION}" >/dev/null

VPC_ID=$(aws ec2 describe-vpcs --region "${REGION}" \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)
if [[ -z "${VPC_ID}" || "${VPC_ID}" == "None" ]]; then
  echo "ERROR: no default VPC in ${REGION}. Create one or set a custom VPC." >&2
  exit 1
fi
echo ">> Default VPC: ${VPC_ID}"

if ! aws ec2 describe-key-pairs --region "${REGION}" --key-names "${KEY_NAME}" >/dev/null 2>&1; then
  echo ">> Creating key pair ${KEY_NAME}"
  aws ec2 create-key-pair --region "${REGION}" --key-name "${KEY_NAME}" \
    --query 'KeyMaterial' --output text > "${KEY_FILE}"
  chmod 400 "${KEY_FILE}"
  echo ">> Saved private key to ${KEY_FILE}"
else
  echo ">> Key pair ${KEY_NAME} already exists"
  if [[ ! -f "${KEY_FILE}" ]]; then
    echo "WARNING: ${KEY_FILE} not found locally. If you don't have it elsewhere, delete the key in AWS and rerun." >&2
  fi
fi

SG_ID=$(aws ec2 describe-security-groups --region "${REGION}" \
  --filters "Name=group-name,Values=${SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [[ "${SG_ID}" == "None" || -z "${SG_ID}" ]]; then
  echo ">> Creating security group ${SG_NAME}"
  SG_ID=$(aws ec2 create-security-group --region "${REGION}" \
    --group-name "${SG_NAME}" --description "Malliq web app SG" \
    --vpc-id "${VPC_ID}" --query 'GroupId' --output text)

  aws ec2 authorize-security-group-ingress --region "${REGION}" --group-id "${SG_ID}" \
    --ip-permissions \
    'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0,Description="ssh"}]' \
    'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description="http"}]' \
    'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description="https"}]' >/dev/null
fi
echo ">> Security group: ${SG_ID}"

AMI_ID=$(aws ec2 describe-images --region "${REGION}" \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023.*-x86_64" \
            "Name=state,Values=available" \
            "Name=architecture,Values=x86_64" \
  --query 'Images | sort_by(@,&CreationDate) | [-1].ImageId' \
  --output text)
echo ">> AMI: ${AMI_ID}"

EXISTING_INSTANCE_ID=$(aws ec2 describe-instances --region "${REGION}" \
  --filters "Name=tag:Name,Values=${NAME}" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "None")

if [[ "${EXISTING_INSTANCE_ID}" != "None" && -n "${EXISTING_INSTANCE_ID}" ]]; then
  echo ">> Instance with tag Name=${NAME} already exists: ${EXISTING_INSTANCE_ID}"
  echo ">> Refusing to launch a duplicate. Delete it first or pick a different STACK_NAME."
  INSTANCE_ID="${EXISTING_INSTANCE_ID}"
else
  echo ">> Launching ${INSTANCE_TYPE} instance"
  INSTANCE_ID=$(MSYS_NO_PATHCONV=1 aws ec2 run-instances --region "${REGION}" \
    --image-id "${AMI_ID}" \
    --instance-type "${INSTANCE_TYPE}" \
    --key-name "${KEY_NAME}" \
    --security-group-ids "${SG_ID}" \
    --user-data "file://${USER_DATA_PATH_FOR_AWS}" \
    --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=${VOLUME_SIZE_GB},VolumeType=gp3,DeleteOnTermination=false}" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}}]" \
                         "ResourceType=volume,Tags=[{Key=Name,Value=${NAME}-root}]" \
    --query 'Instances[0].InstanceId' --output text)
  echo ">> Instance: ${INSTANCE_ID}"
fi

echo ">> Waiting for instance to be running..."
aws ec2 wait instance-running --region "${REGION}" --instance-ids "${INSTANCE_ID}"

EXISTING_EIP=$(aws ec2 describe-addresses --region "${REGION}" \
  --filters "Name=tag:Name,Values=${NAME}" \
  --query 'Addresses[0].AllocationId' --output text 2>/dev/null || echo "None")

if [[ "${EXISTING_EIP}" == "None" || -z "${EXISTING_EIP}" ]]; then
  echo ">> Allocating Elastic IP"
  ALLOC_ID=$(aws ec2 allocate-address --region "${REGION}" --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${NAME}}]" \
    --query 'AllocationId' --output text)
else
  ALLOC_ID="${EXISTING_EIP}"
  echo ">> Reusing existing Elastic IP allocation: ${ALLOC_ID}"
fi

aws ec2 associate-address --region "${REGION}" \
  --instance-id "${INSTANCE_ID}" --allocation-id "${ALLOC_ID}" >/dev/null

PUBLIC_IP=$(aws ec2 describe-addresses --region "${REGION}" \
  --allocation-ids "${ALLOC_ID}" \
  --query 'Addresses[0].PublicIp' --output text)

echo ""
echo "==================================================================="
echo " Provisioning complete"
echo "==================================================================="
echo " Region:       ${REGION}"
echo " Instance:     ${INSTANCE_ID}"
echo " Public IP:    ${PUBLIC_IP}"
echo " SSH key:      ${KEY_FILE}"
echo ""
echo " Next:"
echo "   1. Add DNS A records at your registrar:"
echo "        do-up.cl       A   ${PUBLIC_IP}"
echo "        www.do-up.cl   A   ${PUBLIC_IP}"
echo "   2. Wait ~2 min for cloud-init to finish, then:"
echo "        ssh -i ${KEY_FILE} ec2-user@${PUBLIC_IP}"
echo "   3. Follow infra/aws/DEPLOY.md from step 3 onward."
echo "==================================================================="
