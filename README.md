# Anvid Coffe

Experiencia de raspa y gana con React, Vite y Motion. Una ventana de liquid glass frente a la fotografía animada del café, bienvenida con vertido y sonido, celebración con tapa, globos y confeti, y reseñas voluntarias sobre el café.

```sh
npm install
npm run dev
npm run build
npm test
```

El frontend se genera en `dist/`. Vercel detecta Vite y publica también `api/experience.js` como función Node. Firebase Admin SDK solo se usa en el servidor; no forma parte del JavaScript entregado al visitante.

## Firebase Spark

Las instrucciones completas están en [FIREBASE_SETUP.md](FIREBASE_SETUP.md). El proyecto Firebase es `anvid-coffe`, Firestore Standard `(default)`, nam5, con reglas cerradas. Configurar `FIREBASE_SERVICE_ACCOUNT_JSON` como **Secret** del entorno Production de Vercel y desplegar otra vez. No subir claves a GitHub ni usar el prefijo `VITE_`. Sin configuración o conexión la interfaz permite reintentar y nunca simula una respuesta correcta.

Se usan los planes gratuitos elegidos por el propietario, sujetos a sus cuotas, sin Firebase Cloud Functions, facturación, Storage ni Analytics. El propietario mantiene la configuración y publicación de Vercel.

## Cupones y opiniones

- Máximo un café ganador al día entre todos los participantes, con fechas del servidor y cambio de día a medianoche UTC−6. El servidor elige una posición uniforme entre la 1 y la 15 y la guarda en privado para ese día. Si llegan 15 participaciones nuevas habrá exactamente un ganador; los intentos posteriores pierden. Con menos de 15 puede que la posición ganadora todavía no se haya alcanzado.
- Una transacción Firestore asigna la posición de cada nueva participación, crea el cupón y reserva el único premio diario de manera atómica. Reintentos del mismo navegador/día devuelven el mismo resultado y no consumen otra posición. El cliente no decide si gana ni proporciona la fecha o el código; la posición ganadora no se envía al navegador.
- La actualización respeta los cupones y premios anteriores: si hoy ya hubo ganador, no entrega otro. Si aún no lo hubo, sortea entre las posiciones restantes hasta la 15; si ya existían 15 o más resultados perdedores, gana la siguiente participación nueva, sin alterar tarjetas emitidas.
- Una cookie firmada HttpOnly identifica el navegador y conserva una tarjeta diaria. Borrar cookies o cambiar de navegador crea otra identidad; el límite global de un premio permanece. No se incluye validación de compras.
- El cupón ganador y su PNG incluyen un QR local, sin servicios externos. El panel privado valida el código y lo marca una sola vez como canjeado en una transacción. Acceso por contraseña privada del servidor, sesión firmada y revocable, protección de origen y límite de intentos. Ver [ADMIN_GUIDE.md](ADMIN_GUIDE.md) para configurar y usar el dashboard 2D/3D.
- Cupones: código, ganó/no ganó, día, fecha/hora de emisión y del premio. El cupón ganador se descarga como PNG con su fecha fija.
- Reseñas: estrellas enteras de 1 a 5, comentario opcional de hasta 600 caracteres, creación y actualización. Una opinión por navegador, editable. Se muestran todas las calificaciones, con promedio global y páginas de 20 opiniones. No se piden datos personales y el premio no depende de dejar una reseña.
- Las preferencias de sonido y vibración siguen guardadas localmente. Las tarjetas y opiniones antiguas del modo demostración no se importan. No hay controles para forzar premios.

## Animación y accesibilidad

El raspado funciona con mouse y dedo, además del botón accesible para descubrir la tarjeta. Su sonido sigue el movimiento y se detiene al soltar; los móviles compatibles reciben pequeños pulsos de vibración. Se conserva el silencio elegido por el visitante. Los límites del navegador y el dispositivo determinan la disponibilidad de audio y vibración.

La bienvenida dibuja una cafetera que llena una taza y la transforma en el café del fondo. Su vertido original está horneado en `public/audio/coffee-pour.wav`, generado con `scripts/render-coffee-pour.mjs`. Las líneas de tiempo compartidas sincronizan animaciones y audio. La celebración espera a que se decodifiquen las imágenes del vaso y tapa; durante ella se pausa el shader del fondo, se ocultan sus filtros y el material del diálogo queda estático para reducir el trabajo gráfico en móviles. Los teléfonos usan menos confeti. Si no se gana, el cupón se arruga y rebota en el borde del cesto antes de caer, con sonido sincronizado.

Los diálogos gestionan el foco, los controles tienen alternativas por teclado y la preferencia de movimiento reducido evita la bienvenida y elimina movimiento intenso. El marco conserva la composición móvil con tapa visible por encima del cristal y ANVID detrás.

## Validación

Para comprobar la celebración en un teléfono sin sortear ni gastar premios, abrir `/prueba-premio.html` y pulsar “Probar animación”. Es una entrada HTML independiente que solo monta la animación: no importa el cliente de cupones/reseñas, no monta App y no hace solicitudes a Firebase o `/api/experience`. Permite repetir y activar/silenciar sonido. El diálogo indica que es una prueba y no ofrece cupón ni fecha de premio. La portada del juego no añade controles de demostración.

`npm test` comprueba fecha UTC−6, estrellas/comentarios, firmas de cookie, protección de origen y errores sin configuración. Con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8088`, ejecuta además integración con Firestore: intentos concurrentes, idempotencia, renovación diaria, opiniones, promedio y paginación. No ejecuta sorteos reales en producción. Ver el registro de comprobaciones en `QA.md`.

## Diseño y recursos

Instrument Serif y DM Sans se sirven localmente. Lucide aporta los iconos. La fotografía del café, su fondo, vaso abierto, tapa, granos y bola de papel se generaron para esta marca y se comprimieron en WebP; las imágenes independientes conservan transparencia real. El grano visual es una textura procedural pequeña. No se usan componentes de pago ni grabaciones de terceros.

Referencias de diseño: Motion, 21st.dev, Skiper UI, Animmaster Lib y HorizonX. `DESIGN.md` documenta el material, composición y movimiento.
