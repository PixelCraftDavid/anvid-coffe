# La barra · Panel privado de Anvid

URL: https://anvid-coffe.vercel.app/65141f2d938a20dec25e1497fbb458f7ada0fca0

El nombre de ruta tiene 40 caracteres aleatorios. No hay un enlace en la página pública ni en los QR de clientes. Esta dirección no sustituye la autenticación: el código del proyecto es público y todas las operaciones del panel exigen una sesión validada en el servidor.

## Activación gratuita

Conservar Firebase Spark y Vercel Hobby, sujetos a sus cuotas, sin habilitar facturación. No se usa Firebase Authentication, SMS, Cloud Functions ni un servicio externo de QR. La cuenta de servicio de Firestore existente continúa en `FIREBASE_SERVICE_ACCOUNT_JSON`.

En Vercel → Settings → Environment Variables → Production, añadir como **Secret** `ANVID_ADMIN_PASSWORD` con una contraseña única de 16 a 256 caracteres. No usar `VITE_`, no guardarla en el repositorio y no compartirla en el chat. El propietario confirmó haber configurado esta variable. Se requiere desplegar el último commit después de guardarla.

Abrir el enlace privado e introducir esa contraseña. La sesión dura 8 horas y se guarda en una cookie HttpOnly, Secure en Vercel y SameSite=Strict. También se comprueba una sesión en Firestore en cada petición privada. Cerrar sesión la revoca en el servidor, incluso si se intentara reutilizar una copia antigua de la cookie. Cambiar la contraseña y volver a desplegar invalida las sesiones anteriores. El acceso se limita a 8 intentos por origen de red y 40 globales cada 15 minutos. No se registran contraseñas ni direcciones IP en claro.

## Entregar un café

1. El cliente abre su QR en el cupón o muestra la imagen PNG descargada. Los cupones anteriores siguen siendo reconocibles por su código.
2. En el panel, pulsar **Escanear QR** y permitir la cámara, usar **Leer QR desde una imagen**, o escribir el código `ANV-…`. La imagen se descodifica en el dispositivo; no se sube a un servicio externo.
3. Revisar el código, fecha y estado devueltos por Firebase. Solo **Disponible** permite canjear un premio. **Sin premio**, código inexistente o duplicado no autorizan entrega.
4. Cuando se vaya a entregar el café, pulsar **Marcar como canjeado → Confirmar entrega**. El servidor vuelve a comprobar el cupón dentro de una transacción.
5. Esperar el estado **Canjeado**, su fecha y la confirmación. Un QR copiado, un segundo teléfono o un doble clic no pueden producir otro canje. Si hubo un corte de red, volver a consultar el código antes de entregar otro café.

No se definió una caducidad por el propietario, así que no se inventa una fecha de vencimiento. Un cupón ganador guardado puede canjearse en otra fecha si sigue sin utilizar. El sistema no verifica identidad ni compras; el cupón es un comprobante al portador. El acceso es compartido por el equipo con una sola contraseña, sin cuentas individuales de empleados.

## Dashboard por capas

- La vista 2D prioriza consulta y canje. **Ver en 3D** despliega las áreas de resumen, actividad, historial y reseñas en niveles de profundidad. **Volver a 2D** revierte la transición.
- La transición dura 280 ms con transformaciones CSS y un easing de salida; puede invertirse durante su recorrido. El escáner y la confirmación quedan estables. Movimiento reducido conserva una vista plana sin transición.
- Los datos son reales: tarjetas del día, cupo diario, canjes desde la activación, actividad de siete días, cupones paginados y opiniones. **Actualizar** vuelve a consultarlos; no hay sondeos automáticos continuos. Los filtros se aplican a las páginas cargadas y **Cargar más cupones** permite ampliar la lista.
- En celular el canje aparece primero y el historial después. La cámara se abre por acción del usuario y se detiene al cerrarla, leer un QR, cerrar sesión o desmontar su vista. La cámara física y sus permisos deben comprobarse en el dispositivo del propietario.

## Registros nuevos en Firestore

- `coupons`: añade `redeemedAt` y `redeemedBy=anvid-admin` al registrar un canje; nunca borra la emisión ni el resultado original.
- `stats/redemptions`: cantidad total de canjes registrados por el panel y última fecha.
- `adminSessions`: identificadores derivados de nonces, creación, caducidad y revocación; no almacena cookies ni contraseñas.
- `adminLoginAttempts`: contadores por ventana temporal y una huella HMAC del origen de red; no almacena IP en claro.

Las reglas de Firestore siguen cerradas. El servidor usa IAM y valida origen, contraseña, sesión, tamaño y código. Las respuestas privadas llevan `no-store`. La ruta tiene `noindex`, `no-referrer` y protección contra incrustación en marcos.

## Pruebas

Con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8088`, `npm test` ejecuta 15 pruebas, incluidas lectura de QR generados con un lector independiente, sesión/rotación/logout, acceso anónimo y origen ajeno, límite de intentos, 12 canjes concurrentes con exactamente una confirmación y protección de cupones sin premio o inválidos. No se crean ni canjean premios reales automáticamente.
