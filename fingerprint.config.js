/** @type {import('expo/fingerprint').Config} */
const config = {
  // postinstall only runs patch-package; native bytes live in patches/, not npm script names.
  sourceSkips: ["PackageJsonScriptsAll"],
};

module.exports = config;
