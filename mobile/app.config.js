// Tráfico HTTP en claro solo fuera de producción (emulador/LAN); producción exige HTTPS.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    usesCleartextTraffic: process.env.EAS_BUILD_PROFILE !== 'production',
  },
});
