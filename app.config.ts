import { ExpoConfig, ConfigContext } from 'expo/config';
import 'tsx/cjs'; // Add this to import TypeScript files

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: config.name ?? "Gurbani Paath Player Offline",
    slug: config.slug ?? "gurbani-paath-player",
});