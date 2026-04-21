package cl.malliq.app.ui.admin.contratos

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import cl.malliq.app.data.local.entity.ContratoEntity
import cl.malliq.app.domain.usecase.ConstruirResumenActivo
import cl.malliq.app.ui.components.StatusPill
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.util.Formateo
import java.time.LocalDate

@Composable
fun ContratosScreen(
    onAbrir: (String) -> Unit,
    vm: ContratosViewModel = hiltViewModel()
) {
    val lista by vm.lista.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize().padding(top = 56.dp)) {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Text("Contratos", style = MaterialTheme.typography.labelMedium, color = TextoSecundario)
            Spacer(Modifier.height(2.dp))
            Text(
                "${lista.size} vigentes",
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.height(16.dp))
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(lista, key = { it.id }) { contrato ->
                TarjetaContrato(contrato, onClick = { onAbrir(contrato.id) })
            }
        }
    }
}

@Composable
private fun TarjetaContrato(contrato: ContratoEntity, onClick: () -> Unit) {
    val lifecycle = ConstruirResumenActivo.lifecycle(
        contrato.fechaInicio, contrato.fechaTermino, LocalDate.now()
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(GradientePassport, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                contrato.locatarioId.take(10),
                style = MaterialTheme.typography.titleLarge,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )
            StatusPill(lifecycle = lifecycle)
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "Vence ${Formateo.fechaISO(contrato.fechaTermino)} · ${Formateo.clpCompacto(contrato.rentaFijaClp)} renta",
            style = MaterialTheme.typography.bodyMedium,
            color = TextoSecundario
        )
        contrato.vencimientoGarantia?.let {
            Spacer(Modifier.height(4.dp))
            Text(
                "Garantía hasta ${Formateo.fechaISO(it)}",
                style = cl.malliq.app.ui.theme.NumeroInline,
                color = TextoSecundario
            )
        }
    }
}
