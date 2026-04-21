package cl.malliq.app.ui.admin.locatarios

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import cl.malliq.app.data.local.entity.LocatarioEntity
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.RojoTerracotaClaro
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePinoClaro

@Composable
fun LocatariosScreen(
    onAbrirContrato: (String) -> Unit,
    vm: LocatariosViewModel = hiltViewModel()
) {
    val lista by vm.lista.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 56.dp)
    ) {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Text("Locatarios", style = MaterialTheme.typography.labelMedium, color = TextoSecundario)
            Spacer(Modifier.height(2.dp))
            Text(
                "${lista.size} marcas activas",
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
            items(lista, key = { it.id }) { loc ->
                TarjetaLocatario(loc, onClick = { onAbrirContrato(loc.id) })
            }
        }
    }
}

@Composable
private fun TarjetaLocatario(loc: LocatarioEntity, onClick: () -> Unit) {
    val saludColor = when {
        loc.saludPuntaje >= 75 -> VerdePinoClaro
        loc.saludPuntaje >= 50 -> AmbarSaturado
        else -> RojoTerracotaClaro
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(GradientePassport, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 16.dp)
    ) {
        Box(Modifier.size(12.dp).background(saludColor, CircleShape))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                loc.nombreComercial,
                style = MaterialTheme.typography.titleLarge,
                color = Color.White
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "${loc.categoria} · Salud ${loc.saludPuntaje}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextoSecundario
            )
        }
        Text(
            "%.0f%%".format((1f - loc.riesgoDefault90d) * 100),
            style = cl.malliq.app.ui.theme.NumeroTabular,
            color = saludColor
        )
    }
}
