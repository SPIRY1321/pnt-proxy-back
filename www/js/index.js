
/* =====================================================
   BUSCADOR DE TRANSPARENCIA
   Compatible con Cordova Android
   ===================================================== */


/* =====================================================
   CONSOLA DE DEPURACION
   ===================================================== */

(function () {

    var oldLog = console.log;
    var oldError = console.error;
    var consoleBox = null;

    function createConsoleBox() {

        if (document.getElementById('debugConsole')) return;

        consoleBox = document.createElement('div');

        consoleBox.id = 'debugConsole';

        consoleBox.style.cssText =
            'position:fixed;bottom:0;left:0;width:100%;' +
            'height:200px;background:rgba(0,0,0,.95);' +
            'color:#0f0;font-family:monospace;font-size:11px;' +
            'padding:8px;box-sizing:border-box;' +
            'overflow-y:auto;z-index:99999;display:none;';

        var closeBtn = document.createElement('button');

        closeBtn.innerText = 'Cerrar F12';

        closeBtn.style.cssText =
            'float:right;background:#D90416;color:white;' +
            'border:none;padding:5px 10px;';

        closeBtn.onclick = function () {
            consoleBox.style.display = 'none';
        };

        var logContent = document.createElement('div');

        logContent.id = 'debugLogContent';

        consoleBox.appendChild(closeBtn);
        consoleBox.appendChild(logContent);

        document.body.appendChild(consoleBox);
    }

    window.showDebugConsole = function () {

        createConsoleBox();

        consoleBox.style.display = 'block';
    };

    function appendLog(type, args) {

        createConsoleBox();

        var content = document.getElementById('debugLogContent');

        var msg = Array.prototype.slice.call(args).map(function (arg) {

            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }

            return String(arg);

        }).join(' ');

        var line = document.createElement('div');

        line.style.color =
            type === 'error' ? '#ff5555' : '#00ff00';

        line.textContent = '[' + type + '] ' + msg;

        content.appendChild(line);

        consoleBox.scrollTop = consoleBox.scrollHeight;
    }

    console.log = function () {
        oldLog.apply(console, arguments);
        appendLog('log', arguments);
    };

    console.error = function () {
        oldError.apply(console, arguments);
        appendLog('error', arguments);
    };

    window.onerror = function (msg, url, line) {

        appendLog('error', [
            msg + ' (Línea: ' + line + ')'
        ]);
    };

})();


/* =====================================================
   CONFIGURACION
   ===================================================== */

var API_URL = 'https://datos.gob.mx/api/3/action/package_search';

var RESULTS_PER_PAGE = 20;

var currentSearch = '';

var isCordovaReady = false;


/* =====================================================
   INICIALIZACION
   ===================================================== */

document.addEventListener('deviceready', onDeviceReady, false);

// Permite probar también desde navegador.
document.addEventListener('DOMContentLoaded', function () {

    if (!window.cordova) {
        onDeviceReady();
    }

});


function onDeviceReady() {

    if (isCordovaReady) return;

    isCordovaReady = true;

    console.log('Aplicación inicializada.');

    console.log(
        'Plataforma: ',
        window.cordova ? cordova.platformId : 'Navegador'
    );

    var btnSearch = document.getElementById('btnSearch');

    var searchInput = document.getElementById('searchInput');

    btnSearch.addEventListener('click', function () {

        realizarBusqueda();

    });

    searchInput.addEventListener('keydown', function (event) {

        if (event.key === 'Enter') {
            realizarBusqueda();
        }

    });

    // Consulta inicial.
    fetchTransparenciaData('contrataciones');

}


/* =====================================================
   BUSQUEDA
   ===================================================== */

function realizarBusqueda() {

    var searchInput = document.getElementById('searchInput');

    var query = searchInput.value.trim();

    if (!query) {
        mostrarMensaje('Escribe una palabra para realizar la búsqueda.');
        return;
    }

    fetchTransparenciaData(query);

}


/* =====================================================
   CONSULTA A LA API
   ===================================================== */

function fetchTransparenciaData(query) {

    var loading = document.getElementById('loading');

    var resultsContainer = document.getElementById('resultsContainer');

    var statusMessage = document.getElementById('statusMessage');

    currentSearch = query || 'contrataciones';

    loading.classList.remove('hidden');

    resultsContainer.innerHTML = '';

    statusMessage.innerHTML = '';

    var url = API_URL +
        '?q=' + encodeURIComponent(currentSearch) +
        '&rows=' + RESULTS_PER_PAGE +
        '&start=0';

    console.log('Consultando API: ' + url);

    // En Android utilizamos HTTP nativo.
    if (
        window.cordova &&
        cordova.plugin &&
        cordova.plugin.http
    ) {

        consultarConHttpNativo(url);

    } else {

        // Alternativa para navegador.
        consultarConFetch(url);

    }

}


/* =====================================================
   PETICION NATIVA CORDOVA
   ===================================================== */

function consultarConHttpNativo(url) {

    console.log('Utilizando Advanced HTTP.');

    cordova.plugin.http.setRequestTimeout(30);

    cordova.plugin.http.get(
        url,
        {},
        {
            'Accept': 'application/json'
        },

        function (response) {

            console.log('Respuesta HTTP: ' + response.status);

            try {

                var data = JSON.parse(response.data);

                procesarRespuesta(data);

            } catch (error) {

                finalizarError(
                    'El servidor respondió, pero los datos no tienen un formato JSON válido.'
                );

                console.error(error.message);

            }

        },

        function (error) {

            console.error('Error HTTP nativo:', error);

            var mensaje = 'No fue posible conectar con datos.gob.mx.';

            if (error.status) {
                mensaje += ' Código HTTP: ' + error.status;
            }

            if (error.error) {
                mensaje += ' Detalle: ' + error.error;
            }

            finalizarError(mensaje);

        }
    );

}


/* =====================================================
   PETICION PARA NAVEGADOR
   ===================================================== */

function consultarConFetch(url) {

    fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })

    .then(function (response) {

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        return response.json();

    })

    .then(function (data) {

        procesarRespuesta(data);

    })

    .catch(function (error) {

        console.error('Error Fetch:', error);

        finalizarError(
            'No se pudo consultar la API desde el navegador: ' +
            error.message
        );

    });

}


/* =====================================================
   PROCESAR RESPUESTA
   ===================================================== */

function procesarRespuesta(data) {

    console.log('Procesando información recibida.');

    if (!data || data.success !== true || !data.result) {

        finalizarError('La API devolvió una respuesta no válida.');

        return;
    }

    var items = data.result.results || [];

    ocultarCarga();

    console.log('Registros encontrados: ' + items.length);

    if (items.length === 0) {

        mostrarMensaje('No se encontraron registros.');

        return;
    }

    renderResults(items);

}


/* =====================================================
   MOSTRAR RESULTADOS
   ===================================================== */

function renderResults(items) {

    var resultsContainer = document.getElementById('resultsContainer');

    resultsContainer.innerHTML = '';

    items.forEach(function (item) {

        var card = document.createElement('article');

        card.className = 'card';

        var title = document.createElement('h3');

        title.textContent =
            item.title || 'Registro sin título';

        var notes = document.createElement('p');

        var description = item.notes || 'Sin descripción disponible.';

        notes.textContent =
            description.length > 250
                ? description.substring(0, 250) + '...'
                : description;

        var organization = document.createElement('span');

        organization.className = 'badge';

        organization.textContent =
            item.organization && item.organization.title
                ? item.organization.title
                : 'Dependencia no definida';

        card.appendChild(title);

        card.appendChild(notes);

        card.appendChild(organization);

        // Botón para consultar los detalles del registro.
        var detailsButton = document.createElement('button');

        detailsButton.textContent = 'Ver información';

        detailsButton.style.cssText =
            'display:block;margin-top:12px;padding:9px 14px;' +
            'background:#082962;color:white;border:0;' +
            'border-radius:5px;';

        detailsButton.onclick = function () {

            mostrarDetalle(item);

        };

        card.appendChild(detailsButton);

        resultsContainer.appendChild(card);

    });

}


/* =====================================================
   DETALLE DEL REGISTRO
   ===================================================== */

function mostrarDetalle(item) {

    var container = document.getElementById('resultsContainer');

    container.innerHTML = '';

    var card = document.createElement('article');

    card.className = 'card';

    var title = document.createElement('h3');

    title.textContent = item.title || 'Registro';

    card.appendChild(title);

    agregarDato(card, 'Descripción', item.notes);

    agregarDato(
        card,
        'Dependencia',
        item.organization ? item.organization.title : ''
    );

    agregarDato(card, 'Identificador', item.name);

    agregarDato(
        card,
        'Fecha de creación',
        item.metadata_created
    );

    agregarDato(
        card,
        'Última modificación',
        item.metadata_modified
    );

    // Recursos asociados al conjunto de datos.
    if (item.resources && item.resources.length > 0) {

        var heading = document.createElement('h3');

        heading.textContent = 'Archivos y recursos disponibles';

        heading.style.marginTop = '15px';

        card.appendChild(heading);

        item.resources.forEach(function (resource) {

            var link = document.createElement('button');

            link.textContent =
                resource.name || resource.format || 'Consultar recurso';

            link.style.cssText =
                'display:block;margin-top:8px;padding:10px;' +
                'width:100%;background:#082962;color:white;' +
                'border:0;border-radius:5px;text-align:left;';

            link.onclick = function () {

                if (resource.url) {

                    abrirEnlace(resource.url);

                }

            };

            card.appendChild(link);

        });

    }

    var backButton = document.createElement('button');

    backButton.textContent = 'Regresar a resultados';

    backButton.style.cssText =
        'margin-top:20px;padding:10px;background:#D90416;' +
        'color:white;border:0;border-radius:5px;';

    backButton.onclick = function () {

        fetchTransparenciaData(currentSearch);

    };

    card.appendChild(backButton);

    container.appendChild(card);

}


/* =====================================================
   AGREGAR INFORMACION
   ===================================================== */

function agregarDato(container, label, value) {

    if (!value) return;

    var paragraph = document.createElement('p');

    var strong = document.createElement('strong');

    strong.textContent = label + ': ';

    paragraph.appendChild(strong);

    paragraph.appendChild(
        document.createTextNode(String(value))
    );

    paragraph.style.marginTop = '10px';

    container.appendChild(paragraph);

}


/* =====================================================
   ABRIR RECURSOS
   ===================================================== */

function abrirEnlace(url) {

    if (!url) return;

    if (window.cordova && window.cordova.InAppBrowser) {

        cordova.InAppBrowser.open(
            url,
            '_system',
            'location=yes'
        );

    } else {

        window.open(url, '_blank');

    }

}


/* =====================================================
   MENSAJES Y ERRORES
   ===================================================== */

function ocultarCarga() {

    document.getElementById('loading')
        .classList.add('hidden');

}


function mostrarMensaje(mensaje) {

    ocultarCarga();

    var status = document.getElementById('statusMessage');

    status.textContent = mensaje;

    status.style.cssText =
        'text-align:center;padding:15px;color:#777;';

}


function finalizarError(mensaje) {

    ocultarCarga();

    console.error(mensaje);

    var status = document.getElementById('statusMessage');

    status.innerHTML = '';

    var text = document.createElement('p');

    text.textContent = mensaje;

    text.style.color = '#D90416';

    var debugButton = document.createElement('button');

    debugButton.textContent = 'Ver errores F12';

    debugButton.style.cssText =
        'margin-top:10px;padding:8px 12px;' +
        'background:#082962;color:white;border:0;' +
        'border-radius:5px;';

    debugButton.onclick = function () {

        window.showDebugConsole();

    };

    status.appendChild(text);

    status.appendChild(debugButton);

}
