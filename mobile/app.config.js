// Dynamic layer over app.json. Everything static stays in app.json; this file
// only appends what depends on the build environment:
//
//   GOOGLE_IOS_URL_SCHEME — the reversed iOS OAuth client ID
//   (com.googleusercontent.apps.<number>-<hash>), required by the
//   @react-native-google-signin config plugin to register the iOS URL scheme
//   at prebuild. Set it (plus the EXPO_PUBLIC_GOOGLE_* runtime vars) in .env
//   or as EAS environment variables; unset, the plugin is skipped entirely
//   and the app builds exactly as before — email/password only.
export default ({ config }) => {
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ...(iosUrlScheme
        ? [['@react-native-google-signin/google-signin', { iosUrlScheme }]]
        : []),
    ],
  };
};
