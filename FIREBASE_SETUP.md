# Firebase gratuito y Vercel

Proyecto: `anvid-coffe`. Usa Firestore Standard `(default)` en Spark, sin facturación ni copias de seguridad de pago. No se usan Firebase Cloud Functions, Storage, Analytics ni un SDK de Firebase en el navegador.

## Configuración

1. Crear el proyecto en Firebase y la base Firestore en modo de producción. Conservar las reglas de `firestore.rules`: todo acceso directo desde navegadores queda denegado.
2. Configuración del proyecto → Cuentas de servicio → Firebase Admin SDK → Generar nueva clave privada. Guardar el JSON fuera del repositorio.
3. En Vercel → proyecto → Settings → Environment Variables: crear `FIREBASE_SERVICE_ACCOUNT_JSON` como **Secret**, para **Production**, con todo el JSON como valor. Nunca usar `VITE_`, pegarlo en el chat ni guardarlo en GitHub. El Admin SDK solo se importa desde `api/` y `server/`.
4. Desplegar el último commit de `main` en Vercel. Vite genera `dist`; Vercel publica además la función `api/experience.js`. Añadir o cambiar una variable requiere un nuevo despliegue.
5. Abrir `/api/experience?view=state` en el dominio publicado: debe responder JSON con `day`, `nextResetAt`, `coupon` y `review`. Esta lectura no sortea ni crea un cupón.
6. Raspar una tarjeta guarda un documento en `coupons`. Enviar una reseña guarda estrellas y comentario en `reviews`; las listas se consultan desde otros navegadores. No introducir cupones o reseñas manuales para inicializar la base.

## Reglas del juego

- Máximo **un café ganador global** por fecha de UTC−6, no uno por visitante. El siguiente cupo abre a las 00:00 UTC−6 sin tareas programadas.
- El servidor elige una posición ganadora uniforme entre 1 y 15, la guarda en `dailyDraws` y la conserva durante todo el día. Con 15 participaciones nuevas hay exactamente un ganador; con menos puede que la posición elegida aún no se alcance. Después del ganador todos pierden ese día. Cada nuevo día elige su propia posición, sin tareas programadas.
- Una tarjeta por navegador y día. El servidor firma una cookie HttpOnly, SameSite=Lax y Secure en Vercel. La decisión, el código y la hora salen del servidor, nunca de campos enviados por el cliente ni de localStorage.
- Una transacción lee el cupón del participante, `dailyPrizes/AAAA-MM-DD`, `dailyDraws/AAAA-MM-DD` y el contador `dailyActivity/AAAA-MM-DD`. Asigna la siguiente posición y crea el cupón y su incremento de forma atómica. Si gana, crea también la reserva diaria; la lectura y la precondición de creación impiden dos ganadores, incluso con peticiones simultáneas. Repetir la solicitud devuelve el mismo cupón sin consumir otra posición. La API pública no devuelve la posición ganadora ni el contador interno del cupón.
- Durante la actualización se conservan los resultados emitidos. Si no hubo ganador, se elige entre las posiciones restantes hasta 15; si ya existían 15 o más perdedores, la siguiente participación nueva gana. Si ya hubo premio, no se emite otro.
- Los resultados locales antiguos de la demostración se ignoran. El almacenamiento local solo conserva preferencias de sonido y vibración. Sin conexión/configuración no se crean resultados ni reseñas ficticias.
- La cookie identifica un navegador, no una persona ni una compra: otro navegador o borrar cookies puede dar otra tarjeta, pero nunca abre un segundo premio diario. No hay autenticación de clientes ni validación de compras. El canje por el equipo se realiza en el panel privado documentado en `ADMIN_GUIDE.md`, mediante una transacción de un solo uso.
- Una reseña por navegador, editable, con estrellas enteras de 1 a 5, comentario opcional de hasta 600 caracteres y fechas del servidor. Cambiar una reseña no añade otro voto al promedio. El resultado no condiciona la reseña. Las opiniones son públicas y no se solicitan datos personales.

## Datos

| Colección | Contenido |
| --- | --- |
| `coupons` | Código, día, posición de participación, ganó/no ganó, fecha de emisión y fecha del premio si ganó. ID opaco por navegador/día. |
| `dailyPrizes` | Un documento por fecha ganadora: referencia al cupón y fecha del premio. |
| `dailyDraws` | Posición ganadora privada e inmutable por día, elegida por el servidor. |
| `dailyActivity` | Contador diario de participaciones nuevas, inicializado desde cupones anteriores y actualizado atómicamente. |
| `reviews` | Calificación, comentario, fecha original y última actualización. |
| `stats/reviews` | Total de reseñas y suma de estrellas para el promedio de todas las opiniones. |

Las funciones de Vercel usan la cuenta de servicio con IAM; las reglas cerradas de Firestore permanecen cerradas. La API limita campos, tamaño y frecuencia de actualización, comprueba el origen en escrituras y no almacena respuestas en caché. Spark y Vercel Hobby tienen cuotas: al agotarse puede interrumpirse el servicio; no se habilitan cargos por exceso.

## Desarrollo y pruebas

`npm install`, `npm run dev`, `npm run build`, `npm test`.

Para probar contra un emulador Firestore local, establecer `FIRESTORE_EMULATOR_HOST=127.0.0.1:8088` antes de iniciar Vite y las pruebas. Usa un proyecto `demo-anvid-*` y no requiere claves reales. La alternativa del emulador se rechaza en Vercel y en modo production. Las pruebas de integración solo se ejecutan si esa variable apunta a localhost; el resto comprueba fechas, entradas, cookies, origen y ausencia de configuración. No se prueban premios reales de clientes automáticamente.

Para desarrollo con la base real, usar `.env.local` (ignorado por Git) con la variable privada y reiniciar Vite. No añadirla a ningún archivo público.

Referencias: [Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [transacciones](https://firebase.google.com/docs/firestore/manage-data/transactions), [Admin SDK](https://firebase.google.com/docs/admin/setup), [Vercel Node](https://vercel.com/docs/functions/runtimes/node-js).
