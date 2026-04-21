package cl.malliq.app.ui.locatario.home

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.NumeroTabular
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ContratoLocatarioScreen(onSalir: () -> Unit) {
    val pager = rememberPagerState(pageCount = { 3 })

    Box(
        Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
            .padding(top = 56.dp)
    ) {
        IconButton(onClick = onSalir, modifier = Modifier.padding(start = 12.dp)) {
            Icon(Icons.Rounded.Close, contentDescription = "Cerrar", tint = Color.White)
        }
        Column(modifier = Modifier.padding(top = 48.dp)) {
            Column(Modifier.padding(horizontal = 24.dp)) {
                Text("Mi Contrato", color = TextoSecundario, style = MaterialTheme.typography.labelMedium)
                Text(
                    "Pasaporte financiero",
                    style = MaterialTheme.typography.displaySmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(24.dp))
            HorizontalPager(
                state = pager,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 24.dp),
                pageSpacing = 12.dp
            ) { page ->
                when (page) {
                    0 -> PaginaCondiciones()
                    1 -> PaginaFechas()
                    2 -> PaginaAjustesUf()
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                repeat(3) { i ->
                    val color = if (pager.currentPage == i) AmbarSaturado else SurfaceOverlay
                    Box(
                        Modifier
                            .padding(horizontal = 3.dp)
                            .size(width = if (pager.currentPage == i) 20.dp else 6.dp, height = 6.dp)
                            .background(color, RoundedCornerShape(100.dp))
                    )
                }
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun PaginaCondiciones() {
    PaginaBase(titulo = "Condiciones económicas") {
        DatoFinanciero("Renta fija", "$ 4.850.000")
        DatoFinanciero("Renta base UF/m²", "UF 1,20")
        DatoFinanciero("Porcentaje variable", "5,5%")
        DatoFinanciero("Gastos comunes", "$ 820.000")
        DatoFinanciero("Fondo promoción", "$ 180.000")
    }
}

@Composable
private fun PaginaFechas() {
    PaginaBase(titulo = "Fechas clave") {
        DatoFinanciero("Inicio", "01/03/2024")
        DatoFinanciero("Término", "28/02/2029")
        DatoFinanciero("Garantía vigente", "hasta 31/12/2025")
        DatoFinanciero("Próximo escalonado", "01/03/2026")
    }
}

@Composable
private fun PaginaAjustesUf() {
    PaginaBase(titulo = "Ajustes UF") {
        DatoFinanciero("UF hoy", "39.845,10")
        DatoFinanciero("Variación últimos 30 días", "+0,32%")
        DatoFinanciero("Renta en CLP hoy", "$ 4.875.200")
    }
}

@Composable
private fun PaginaBase(titulo: String, content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(GradientePassport, RoundedCornerShape(28.dp))
            .padding(24.dp)
    ) {
        Text(
            titulo.uppercase(),
            color = TextoSecundario,
            style = MaterialTheme.typography.labelMedium
        )
        Spacer(Modifier.height(16.dp))
        content()
    }
}

@Composable
private fun DatoFinanciero(etiqueta: String, valor: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
    ) {
        Text(etiqueta, color = TextoSecundario, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Text(valor, style = NumeroTabular, color = Color.White)
    }
}
