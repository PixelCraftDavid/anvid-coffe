# La barra · Panel privado de Anvid

URL: https://anvid-coffe.vercel.app/65141f2d938a20dec25e1497fbb458f7ada0fca0

El nombre de ruta tiene 40 caracteres aleatorios. No hay un enlace en la página pública ni en los QR de clientes. Esta dirección no sustituye la autenticación: el código del proyecto es público y todas las operaciones del panel exigen una sesión validada en el servidor.

## Activación gratuita

Conservar Firebase Spark y Vercel Hobby, sujetos a sus cuotas, sin habilitar facturación. No se usa Firebase Authentication, SMS, Cloud Functions ni un servicio externo de QR. La cuenta de servicio de Firestore existente continúa en `FIREBASE_SERVICE_ACCOUNT_JSON`.

En Vercel → Settings → Environment Variables → Production, añadir como **Secret** `ANVID_ADMIN_PASSWORD` con una contraseña única de 16 a 256 caracteres. No usar `VITE_`, no guardarla en el repositorio y no compartirla en el chat. El propietario confirmó haber configurado esta variable. Se requiere desplegar el último commit después de guardarla.

Abrir el enlace privado e introducir esa contraseña. La sesión dura 8 horas y se guarda en una cookie HttpOnly, Secure en Vercel y SameSite=Strict. También se comprueba una sesión en Firestore en cada petición privada. Cerrar sesión la revoca en el servidor, incluso si se intentara reutilizar una copia antigua de la cookie. Cambiar la contraseña y volver a desplegar invalida las sesiones anteriores. El acceso se limita a 8 intentos por origen de red y 40 globales cada 15 minutos. No se registran contraseñas ni direcciones IP en claro.

## Registrar ventas y consultar ganancias

1. Entrar al panel y abrir **Ventas**. En **Un café más**, elegir **UTVM** o **Centro** y la cantidad vendida, después de cobrar.
2. El precio base es **$30 MXN** y el costo aproximado **$9.95** por café. **Editar** permite registrar otros importes para esa venta; las anteriores conservan su precio/costo original.
3. Pulsar **Registrar venta** y esperar la confirmación. Si el cliente quiere jugar, seleccionar su identificador en la herramienta de arriba y activar **Ya registré esta venta**, eligiendo este registro. **Nueva venta** prepara otro cobro. No vuelvas a registrar la misma compra al autorizar.
4. El resumen de hoy muestra ingresos, costo y utilidad estimada. Esta utilidad no descuenta otros gastos ni cafés de cortesía; no es una utilidad neta contable.
5. En **El ritmo de tus ventas**, elegir 7, 30 o 90 días y alternar ingresos/utilidad. El control **Consultar día** funciona por teclado. El mapa compara la cantidad vendida en cada zona durante ese mismo periodo.
6. Una venta mal capturada puede anularse con el icono de regreso en **Cada venta cuenta → Confirmar anulación**. Conserva los importes originales, añade un sello y corrige los totales de ese día. También bloquea sus pases pendientes. No procesa un reembolso ni cambia premios ya emitidos.

Las ubicaciones del mapa representan zonas de referencia, no el puesto exacto ni la ubicación de clientes. Los datos vectoriales de OpenStreetMap se sirven localmente y conservan su licencia en `/maps/README.txt`; no hay geolocalización, mosaicos externos ni claves de mapas. Al comenzar, los importes son cero hasta registrar ventas reales: no se deducen ventas de las tarjetas del juego.

## QR impreso y autorización del juego

1. Abrir **Ventas → Un QR para tu mostrador → Descargar para imprimir**. Imprimir la lámina PNG una vez; apunta siempre a `https://anvid-coffe.vercel.app/#jugar`, nunca al panel ni a localhost.
2. Después de cobrar, pedir al cliente que escanee. La pantalla muestra un identificador como `ABC-123`. La cola y el contador de **Ventas** se actualizan automáticamente, normalmente dentro de 8 segundos. No hay juego habilitado todavía.
3. Comparar el identificador del teléfono del comprador con el del panel. Seleccionar esa fila o buscar el código exacto. No autorizar una fila solo porque apareció en la lista.
4. Elegir UTVM/Centro y pulsar **Registrar venta y autorizar**. Registra **1 café de $30**, costo aproximado $9.95, y activa un único intento en una transacción. No registres esa venta de nuevo en el formulario manual.
5. Si ya capturaste la venta, activar **Ya registré esta venta**, seleccionar el registro y pulsar **Autorizar con esta venta**. No suma ingresos; utiliza uno de sus intentos libres. Las ventas con varios cafés tienen un intento por café. Repetir la misma autorización no la duplica.
6. La tarjeta del cliente se abre automáticamente, normalmente en 5 segundos si su pantalla está visible y conectada. Abrir o recargar no consume nada. Solo revelar utiliza el intento y participa en el sorteo de ese día. El resultado se recupera en el mismo navegador. Para otra compra, **Compré otro café** prepara un nuevo identificador.

Los identificadores pendientes caducan después de **15 minutos** y pueden descartarse sin registrar ventas ni consumir premios. El cliente puede solicitar otro si caducó; no se cobra nuevamente por este cambio. Si se anuló una compra autorizada pero aún no jugada, sus intentos quedan bloqueados y puede generar otra solicitud; revisa físicamente la compra antes de vincularla a una venta válida. Cambiar de navegador o borrar cookies pierde el vínculo; no autorices dos intentos para el mismo café.

El QR fijo y el enlace se pueden compartir, pero compartirlos no desbloquea el raspado: cada compra requiere aprobación privada y el intento se vincula al navegador del cliente. El identificador de seis caracteres es una etiqueta de atención, no una contraseña. Se limitan las solicitudes nuevas a 60 por huella de red y 120 globales cada 15 minutos. Volver a abrir una solicitud vigente no aumenta esos contadores. No se guardan direcciones IP en claro.

El sorteo mantiene la posición ganadora privada al azar entre las primeras 15 participaciones válidas del día UTC−6; con 15 intentos nuevos habrá exactamente un ganador. Escanear y autorizar no toman posiciones ni gastan el premio. El QR del cupón ganador es distinto del QR impreso y sirve exclusivamente para el canje. Las reseñas siguen siendo voluntarias.

**Compatibilidad:** los pases individuales entregados anteriormente siguen funcionando. **Cada venta cuenta → Ver QR** recupera esos pases para casos existentes. El flujo habitual usa el QR fijo y la autorización presencial. Una venta histórica sin pases obtiene sus intentos solo cuando se autoriza explícitamente con ella; no se altera su ingreso original. Un pase individual antiguo aún no utilizado conserva su condición al portador; uno vinculado a identificador rechaza otros navegadores.

## Entregar un café

1. El cliente abre su QR en el cupón o muestra la imagen PNG descargada. Los cupones anteriores siguen siendo reconocibles por su código.
2. Abrir **Canjes** y pulsar **Escanear QR** y permitir la cámara, usar **Leer desde una imagen**, o escribir el código `ANV-…`. La imagen se descodifica en el dispositivo; no se sube a un servicio externo.
3. Revisar el código, fecha y estado devueltos por Firebase. Solo **Disponible** permite canjear un premio. **Sin premio**, código inexistente o duplicado no autorizan entrega.
4. Cuando se vaya a entregar el café, pulsar **Marcar como canjeado → Confirmar entrega**. El servidor vuelve a comprobar el cupón dentro de una transacción.
5. Esperar el estado **Canjeado**, su fecha y la confirmación. Un QR copiado, un segundo teléfono o un doble clic no pueden producir otro canje. Si hubo un corte de red, volver a consultar el código antes de entregar otro café.

No se definió una caducidad por el propietario, así que no se inventa una fecha de vencimiento. Un cupón ganador guardado puede canjearse en otra fecha si sigue sin utilizar. El cupón ganador es un comprobante al portador, aunque su participación se autorizó contra una compra; no verifica identidad personal. El acceso es compartido por el equipo con una sola contraseña, sin cuentas individuales de empleados.

## Probar el QR en tu celular sin gastar el premio

1. Entrar al panel privado y abrir **Canjes → Un QR. Otra dimensión → Crear QR de prueba**. **Probar sin premio real** lleva directamente a ese ejemplo.
2. El código empieza por `TEST-` y se muestra **PRUEBA · SIN VALOR DE CANJE**. Pulsar **Guardar QR de prueba**.
3. En el mismo celular, abrir **Leer desde una imagen → Elegir imagen del QR** y seleccionar la imagen guardada. Para probar la cámara, mostrar ese QR en otra pantalla y usar **Escanear QR** en el celular.
4. Revisar el aviso de prueba y pulsar **Simular canje → Confirmar prueba**. Debe aparecer **Canjeado** y **El premio diario sigue intacto**. Volver a consultar ese mismo QR mantiene el estado usado; crear otro QR permite repetir la prueba.

**Probar este canje** carga directamente el código en el validador cuando solo se quiere comprobar la confirmación. Estos registros viven exclusivamente en `testCoupons`, usan el prefijo QR `ANVID-TEST:`, exigen sesión privada y nunca modifican `dailyPrizes`, `dailyDraws`, `coupons`, `dailyActivity` ni `stats/redemptions`. No aparecen en el historial o las cantidades reales. Los códigos normales conservan su comportamiento y su confirmación de entrega.

El QR se muestra plano de forma predeterminada. Tocarlo eleva una escena de café con taza cuadrada, asa, vapor, granos y detalles de jardín hechos de vóxeles. Otro toque vuelve a la vista superior. Café, caramelo, crema y verdes comparten la misma paleta en ambas vistas. La vista plana y la descarga conservan el código real y su margen libre; la escena 3D es una presentación y debe devolverse al plano para escanear. El ejemplo inicial es solo visual; **Crear QR de prueba** lo sustituye por un TEST registrado y válido. El mismo componente aparece en pases y cupones ganadores.

## Dashboard y mapa por capas

- Cinco apartados independientes: **Resumen**, **Ventas**, **Actividad**, **Opiniones** y **Canjes**. La barra lateral de computadora se convierte en navegación inferior en celular. Los enlaces guardan el apartado en la URL y funcionan con Atrás/Adelante. Solo las herramientas de la vista activa permanecen montadas.
- El degradado wave original se conserva. El café sobresale del marco en capas con sombra, flotación y profundidad; las pestañas curvas de los contenedores comparten una retícula alineada. El movimiento comienza automáticamente y se pausa al ocultar la pestaña o salir de pantalla; respeta movimiento reducido. **A tu ritmo → Editar meta diaria** permite guardar una meta de 1 a 500 cafés en este dispositivo; inicialmente son 15 y no cambia los premios del juego.
- Ventas, reseñas y canjes de otros dispositivos aparecen automáticamente, normalmente dentro de unos **8 segundos**, mientras el panel está visible y conectado. **Al día · auto**, **Reconectando**, **Sin conexión** o **En pausa** indican el estado. Se conservan el formulario en curso, los filtros y los comentarios abiertos. **Actualizar panel** queda como consulta manual opcional. Al regresar de una pestaña oculta o recuperar la conexión, vuelve a comprobar cambios. Las animaciones no provocan lecturas de datos.
- Tocar directamente el mapa anual lo convierte de 2D en 3D: las participaciones de cada día se elevan como columnas. Otro toque devuelve la vista plana. No hay un interruptor aparte. En 3D se puede arrastrar para girar. Las flechas consultan días; Enter o espacio cambian la perspectiva.
- La transición dura 280 ms y puede invertirse durante su recorrido. El canje y su confirmación quedan estables. Movimiento reducido cambia la vista sin el recorrido animado.
- El mapa ahora usa un único Canvas 2D con proyección isométrica. Se eliminaron las 365 estructuras y sus tres caras HTML, los filtros y las capas 3D individuales. Los días vacíos comparten un dibujo y solo las participaciones elevadas necesitan caras. La resolución se limita a 1,5 veces el tamaño visible; no hay bucle en reposo, ni trabajo al quedar fuera de pantalla o en una pestaña oculta. En plano se desliza para recorrer el año; en 3D se arrastra para girar. No se añadió Three.js ni otra dependencia.
- Los datos son reales: tarjetas del día, cupo diario, canjes desde la activación, actividad de 365 días, cupones paginados y opiniones. La comprobación automática descarga solo los apartados que cambiaron y se detiene sin conexión o al ocultarse. No vuelve a leer todo el año cada ocho segundos. Una consulta sin cambios usa un registro de cambios acotado y la validación de sesión; no recorre las colecciones de ventas o reseñas. Se conserva Spark/Hobby, sujetos a sus cuotas. Una migración larga avanza 14 días por consulta y señala días pendientes en vez de inventar ceros.
- Los métodos de canje se abren desde controles compactos con un acordeón animado: **Escribir código**, **Escanear QR** y **Leer desde una imagen**. En **Opiniones**, las reseñas aparecen en una cuadrícula de estrellas, comentario y fecha, sin fotografías. Los comentarios largos pueden abrirse completos y **Cargar más opiniones** consulta las siguientes 20, sin limitar el apartado a las cuatro más recientes.
- En celular, el año plano se desplaza horizontalmente y su vista 3D se ajusta a la pantalla. La cámara se abre por acción del usuario y se detiene al cerrarla, leer un QR, ocultar la pestaña, cerrar sesión o desmontar su vista. La cámara física y sus permisos deben comprobarse en el dispositivo del propietario.

## Registros nuevos en Firestore

- `coupons`: añade `redeemedAt` y `redeemedBy=anvid-admin` al registrar un canje; nunca borra la emisión ni el resultado original.
- `stats/redemptions`: cantidad total de canjes registrados por el panel y última fecha.
- `adminSessions`: identificadores derivados de nonces, creación, caducidad y revocación; no almacena cookies ni contraseñas.
- `adminLoginAttempts`: contadores por ventana temporal y una huella HMAC del origen de red; no almacena IP en claro.
- `dailyActivity`: una cantidad diaria derivada de los cupones, inicializada una vez y aumentada en la misma transacción que crea cada nueva participación. Restaurar una tarjeta no incrementa su cantidad.
- `testCoupons`: códigos `TEST-…`, fechas y estado de canje de pruebas privadas. No tienen valor de premio ni se mezclan con las estadísticas reales.
- `sales`: cantidad, zona, precio/costo en centavos, importes calculados, fecha del servidor y eventual fecha de anulación. Clave idempotente por solicitud.
- `dailySales`: totales diarios y por zona para ingresos, costo y utilidad estimada. Se actualizan en la misma transacción que cada registro o anulación.
- `playPasses`: identificador derivado de un token aleatorio de 192 bits, venta, número de pase, creación y eventual consumo con navegador y cupón. Los tokens se guardan solo en el registro privado de la venta para volver a entregar los mismos QR. La API pública nunca lista pases.
- `playRequests`: identificador, estado pendiente/autorizado/usado/cancelado/caducado, fechas y vínculo privado a navegador e intento.
- `playRequestOwners`: última solicitud del navegador, identificado mediante cookie firmada.
- `playWaiting`: cola de identificadores vigentes; se retira al autorizar, descartar o reemplazar. Los caducados quedan excluidos por fecha sin procesos de pago.
- `playRequestLimits`: contadores por ventana y huella HMAC de red, sin IP en claro.
- `participants`: referencia al último cupón del navegador para recuperar su resultado. No contiene nombres ni datos de contacto.
- `dashboardEvents`: un registro pequeño con tema y fecha de confirmación por cambio real, creado dentro de la misma transacción. No contiene contraseñas ni comentarios. Permite consultar cambios recientes con un cursor preciso, sin recorrer todos los registros ni mantener conexiones abiertas. Reintentos idénticos y canjes TEST no generan eventos reales.

Las reglas de Firestore siguen cerradas. El servidor usa IAM y valida origen, contraseña, sesión, tamaño y código. Las respuestas privadas llevan `no-store`. La ruta tiene `noindex`, `no-referrer` y protección contra incrustación en marcos.

## Pruebas

Con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8088`, `npm test` ejecuta 56 pruebas, incluidas las 15 posiciones ganadoras, aislamiento TEST, canje de un solo uso, mapa ligero, sesiones privadas, ventas concurrentes, centavos exactos, anulaciones idempotentes y conservación de costos históricos. También comprueba cambios atómicos, consultas sin cambios, cursores, pausa, reintentos, pases ligados a compras, uso simultáneo, lectura de QR en color y límites de la escena de vóxeles, solicitud/caducidad/cancelación, aprobación atómica, venta reutilizada sin duplicar ingreso, vínculo al navegador y límites de solicitudes. No se crean ni canjean premios ni ventas reales automáticamente.
