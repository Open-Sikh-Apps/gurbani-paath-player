import { useEffect, useState } from "react";

import { REMOTE_IMAGE_HEADERS } from "@/catalogue";
import { useIsOnline } from "@/downloads";
import { Image, cn } from "@/tw";

type CatalogueImageProps = {
  uri: string | undefined;
  className?: string;
  accessibilityLabel: string;
};

export function CatalogueImage({
  uri,
  className,
  accessibilityLabel,
}: CatalogueImageProps) {
  const online = useIsOnline();
  const [failed, setFailed] = useState(false);

  // Retry after reconnect or a new uri; a prior onError would otherwise keep the image hidden.
  useEffect(() => {
    if (online) {
      setFailed(false);
    }
  }, [online, uri]);

  // Hide a broken image while offline; while online, keep Image mounted so it can retry.
  if (!uri || (failed && !online)) {
    return null;
  }

  return (
    <Image
      // Some CDNs 403 a default RN user-agent; send the app UA.
      source={{ uri, headers: REMOTE_IMAGE_HEADERS }}
      cachePolicy="memory-disk"
      className={cn("w-full rounded-2xl object-cover", className)}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
      onError={() => setFailed(true)}
      onLoad={() => setFailed(false)}
    />
  );
}
