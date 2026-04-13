import { deleteDB, openDB } from 'idb';

const DB_NAME = 'malliq-documents';
const STORE_NAME = 'files';

async function getDatabase() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveDocumentBlob(id: string, file: Blob): Promise<void> {
  const database = await getDatabase();
  await database.put(STORE_NAME, file, id);
}

export async function getDocumentBlob(id: string): Promise<Blob | undefined> {
  const database = await getDatabase();
  return database.get(STORE_NAME, id);
}

export async function deleteDocumentBlob(id: string): Promise<void> {
  const database = await getDatabase();
  await database.delete(STORE_NAME, id);
}

export async function resetDocumentStorage(): Promise<void> {
  await deleteDB(DB_NAME);
}
