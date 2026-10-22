# La barra · Panel privado de Anvid

URL: https://anvid-coffe.vercel.app/65141f2d938a20dec25e1497fbb458f7ada0fca0

El nombre de ruta tiene 40 caracteres aleatorios. No hay un enlace en la página pública ni en los QR de clientes. Esta dirección no sustituye la autenticación: el código del proyecto es público y todas las operaciones del panel exigen una sesión validada en el servidor.

## Activación gratuita

Conservar Firebase Spark y Vercel Hobby, sujetos a sus cuotas, sin habilitar facturación. No se usa Firebase Authentication, SMS, Cloud Functions ni un servicio externo de QR. La cuenta de servicio de Firestore existente continúa en `FIREBASE_SERVICE_ACCOUNT_JSON`.

En Vercel → Settings → Environment Variables → Production, añadir como **Secret** `ANVID_ADMIN_PASSWORD` con una contraseña única de 16 a 256 caracteres. No usar `VITE_`, no guardarla en el repositorio y no compartirla en el chat. El propietario confirmó haber configurado esta variable. Se requiere desplegar el último commit después de guardarla.

Abrir el enlace privado e introducir esa contraseña. La sesión dura 8 horas y se guarda en una cookie HttpOnly, Secure en Vercel y SameSite=Strict. También se comprueba una sesión en Firestore en cada petición privada. Cerrar sesión la revoca en el servidor, incluso si se intentara reutilizar una copia antigua de la cookie. Cambiar la contraseña y volver a desplegar invalida las sesiones anteriores. El acceso se limita a 8 intentos por origen de red y 40 globales cada 15 minutos. No se registran contraseñas ni direcciones IP en claro.

## Entregar un café

1. El cliente abre su QR en el cupón o muestra la imagen PNG descargada. Los cupones anteriores siguen siendo reconocibles por su código.
2. En el panel, pulsar **Escanear QR** y permitir la cámara, usar **Leer desde una imagen**, o escribir el código `ANV-…`. La imagen se descodifica en el dispositivo; no se sube a un servicio externo.
3. Revisar el código, fecha y estado devueltos por Firebase. Solo **Disponible** permite canjear un premio. **Sin premio**, código inexistente o duplicado no autorizan entrega.
4. Cuando se vaya a entregar el café, pulsar **Marcar como canjeado → Confirmar entrega**. El servidor vuelve a comprobar el cupón dentro de una transacción.
5. Esperar el estado **Canjeado**, su fecha y la confirmación. Un QR copiado, un segundo teléfono o un doble clic no pueden producir otro canje. Si hubo un corte de red, volver a consultar el código antes de entregar otro café.

No se definió una caducidad por el propietario, así que no se inventa una fecha de vencimiento. Un cupón ganador guardado puede canjearse en otra fecha si sigue sin utilizar. El sistema no verifica identidad ni compras; el cupón es un comprobante al portador. El acceso es compartido por el equipo con una sola contraseña, sin cuentas individuales de empleados.

## Probar el QR en tu celular sin gastar el premio

1. Entrar al panel privado y abrir **Probar sin premio real → Crear QR de prueba**.
2. El código empieza por `TEST-` y se muestra **PRUEBA · SIN VALOR DE CANJE**. Pulsar **Guardar QR de prueba**.
3. En el mismo celular, abrir **Leer desde una imagen → Elegir imagen del QR** y seleccionar la imagen guardada. Para probar la cámara, mostrar ese QR en otra pantalla y usar **Escanear QR** en el celular.
4. Revisar el aviso de prueba y pulsar **Simular canje → Confirmar prueba**. Debe aparecer **Canjeado** y **El premio diario sigue intacto**. Volver a consultar ese mismo QR mantiene el estado usado; crear otro QR permite repetir la prueba.

**Probar este canje** carga directamente el código en el validador cuando solo se quiere comprobar la confirmación. Estos registros viven exclusivamente en `testCoupons`, usan el prefijo QR `ANVID-TEST:`, exigen sesión privada y nunca modifican `dailyPrizes`, `coupons`, `dailyActivity` ni `stats/redemptions`. No aparecen en el historial o las cantidades reales. Los códigos normales conservan su comportamiento y su confirmación de entrega.

## Dashboard y mapa por capas

- Tocar directamente el mapa anual lo convierte de 2D en 3D: las participaciones de cada día se elevan como columnas. Otro toque devuelve la vista plana. No hay un interruptor aparte. En 3D se puede arrastrar para girar. Las flechas consultan días; Enter o espacio cambian la perspectiva.
- La transición dura 280 ms y puede invertirse durante su recorrido. El canje y su confirmación quedan estables. Movimiento reducido cambia la vista sin el recorrido animado.
- El mapa ahora usa un único Canvas 2D con proyección isométrica. Se eliminaron las 365 estructuras y sus tres caras HTML, los filtros y las capas 3D individuales. Los días vacíos comparten un dibujo y solo las participaciones elevadas necesitan caras. La resolución se limita a 1,5 veces el tamaño visible; no hay bucle en reposo, ni trabajo al quedar fuera de pantalla o en una pestaña oculta. En plano se desliza para recorrer el año; en 3D se arrastra para girar. No se añadió Three.js ni otra dependencia.
- Los datos son reales: tarjetas del día, cupo diario, canjes desde la activación, actividad de 365 días, cupones paginados y opiniones. **Actualizar** vuelve a consultarlos; no hay sondeos automáticos continuos. El mapa usa acumulados diarios y recupera los cupones anteriores sin duplicarlos. Una migración larga avanza 14 días por consulta y señala los días pendientes en vez de inventar ceros.
- Los métodos de canje se abren desde controles compactos con un acordeón animado: **Escribir código**, **Escanear QR** y **Leer desde una imagen**. Las reseñas aparecen en tarjetas de estrellas, comentario y fecha, sin fotografías. Los comentarios largos pueden abrirse completos y la fila se desplaza manualmente.
- En celular, el año plano se desplaza horizontalmente y su vista 3D se ajusta a la pantalla. La cámara se abre por acción del usuario y se detiene al cerrarla, leer un QR, ocultar la pestaña, cerrar sesión o desmontar su vista. La cámara física y sus permisos deben comprobarse en el dispositivo del propietario.

## Registros nuevos en Firestore

- `coupons`: añade `redeemedAt` y `redeemedBy=anvid-admin` al registrar un canje; nunca borra la emisión ni el resultado original.
- `stats/redemptions`: cantidad total de canjes registrados por el panel y última fecha.
- `adminSessions`: identificadores derivados de nonces, creación, caducidad y revocación; no almacena cookies ni contraseñas.
- `adminLoginAttempts`: contadores por ventana temporal y una huella HMAC del origen de red; no almacena IP en claro.
- `dailyActivity`: una cantidad diaria derivada de los cupones, inicializada una vez y aumentada en la misma transacción que crea cada nueva participación. Restaurar una tarjeta no incrementa su cantidad.
- `testCoupons`: códigos `TEST-…`, fechas y estado de canje de pruebas privadas. No tienen valor de premio ni se mezclan con las estadísticas reales.

Las reglas de Firestore siguen cerradas. El servidor usa IAM y valida origen, contraseña, sesión, tamaño y código. Las respuestas privadas llevan `no-store`. La ruta tiene `noindex`, `no-referrer` y protección contra incrustación en marcos.

## Pruebas

Con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8088`, `npm test` ejecuta 22 pruebas, incluidas aislamiento de cupones TEST, canje de un solo uso sin modificar premios reales, trabajo acotado del mapa, pausa y cancelación, migración del mapa anual, lectura de QR, sesión/rotación/logout, límite de intentos y canjes concurrentes. No se crean ni canjean premios reales automáticamente.
