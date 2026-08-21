import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  getReciterById,
  getSehajPaathCollections,
  loadCatalogue,
  resolveL10n,
  type Catalogue,
} from "@/catalogue";

const PREVIEW_LOCALE = "pa";

export function CataloguePreviewScreen() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalogue()
      .then((loaded) => {
        if (!cancelled) {
          setCatalogue(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!catalogue) {
    return <View style={styles.centered} />;
  }

  const albums = getSehajPaathCollections(catalogue);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.fateh}>
        Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!
      </Text>
      <Image
          source={{
            uri: catalogue.heroImageUrl,
            headers: {
              'User-Agent': 'GurbaniPaathPlayerOffline/1.0 (cingh.jasdeep@gmail.com)' 
            }
           }}
          style={styles.hero}
          accessibilityIgnoresInvertColors
        />
      <Text>{catalogue.version}</Text>
      {albums.map((album) => {
        const reciter = getReciterById(catalogue, album.reciterId);
        const heading = reciter?.name;
        return (
          <View key={album.id} style={styles.block}>
            {heading ? (
              <Text style={styles.heading}>
                {resolveL10n(heading, PREVIEW_LOCALE)}
              </Text>
            ) : null}
            <Text>{album.tracks.length}</Text>
            {album.tracks.map((track) => (
              <Text key={track.id}>
                {resolveL10n(track.title, PREVIEW_LOCALE)}
              </Text>
            ))}
          </View>
        );
      })}
      <View style={styles.block}>
        {catalogue.resources.map((resource) => (
          <Text key={resource.id}>
            {resolveL10n(resource.title, PREVIEW_LOCALE)}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    gap: 12,
  },
  fateh: {
    marginBottom: 8,
  },
  hero: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  block: {
    gap: 4,
    marginTop: 12,
  },
  heading: {
    fontWeight: "600",
  },
});
