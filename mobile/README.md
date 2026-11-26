# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


## Mostrador — Ejecución del proyecto

Mostrador es la aplicación de autopedido del cliente, desarrollada con Expo, React Native y TypeScript para funcionar en Android y web.

### Instalar dependencias

Desde la carpeta `mobile`, ejecutar:

```bash
npm ci
```

### Iniciar en web

```bash
npm run web
```

Expo iniciará el servidor de desarrollo y mostrará la dirección local para abrir la aplicación en el navegador.

### Iniciar en Android

```bash
npm run android
```

Se necesita tener configurado el Android SDK y, si se utiliza un emulador, Android Studio con un dispositivo virtual disponible.

### Iniciar Expo

```bash
npm start
```

### Verificar las dependencias

```bash
npx expo-doctor
```

Este comando comprueba la compatibilidad de las dependencias con la configuración de Expo.

### Pantalla inicial

La pantalla principal muestra el catálogo del comercio, desde donde el cliente arma su carrito y confirma el pedido.

### Demo local del autopedido

Todo corre en la máquina local. La web resuelve el comercio por subdominio (`*.localhost` funciona en Chrome y Edge sin configurar nada).

1. Base de datos: PostgreSQL local con una base vacía, y `backend/.env` apuntando a ella (ver `backend/.env.example`).
2. Esquema y datos de la demo, desde `backend`:

   ```bash
   npm ci
   npm run db:apply
   psql -h localhost -U postgres -d <base> -f ../database/seeds/dev_local1.sql
   ```

   El seed es idempotente. Crea `local1/palermo` (con WhatsApp ficticio) y `local2/centro` (sin número).
3. Backend, desde `backend`: `npm run start:dev` (puerto 3000).
4. Web, desde `mobile`: copiar `.env.example` a `.env` (opcional en web) y ejecutar `npx expo start --web --port 8081`.
5. Abrir `http://local1.localhost:8081/palermo`. Para el comercio sin número: `http://local2.localhost:8081/centro`.

### Código compartido y builds en CI (RNF-018)

- `npm run shared-code` mide el porcentaje de código compartido entre Android y web (archivos de `src/` sin sufijo `.web`/`.android`/`.ios`/`.native`) y falla si es menor a 90% (umbral configurable: `node scripts/shared-code.js 85` o `SHARED_CODE_MIN`).
- `.github/workflows/mobile-build.yml` corre tests, la medición, `expo export --platform web` y `expo prebuild` + `gradlew assembleDebug`. Cada build tiene `timeout-minutes: 30` y sube su artefacto (`web-dist`, `android-debug-apk`).
