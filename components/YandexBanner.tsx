import { useEffect, useState } from "react";
import {
    LayoutChangeEvent,
    StyleSheet,
    View,
} from "react-native";
import {
    BannerAdSize,
    BannerView,
    MobileAds,
} from "yandex-mobile-ads";

type BannerSize = Awaited<
  ReturnType<typeof BannerAdSize.stickySize>
>;

const FALLBACK_BANNER_HEIGHT = 58;

export default function YandexBanner() {
  const [containerWidth, setContainerWidth] = useState(0);
  const [bannerSize, setBannerSize] = useState<BannerSize | null>(null);

  useEffect(() => {
    if (containerWidth <= 0) {
      return;
    }

    let active = true;

    const prepareBanner = async () => {
      try {
        MobileAds.setUserConsent(false);
        await MobileAds.initialize();

        const size = await BannerAdSize.stickySize(containerWidth);

        if (active) {
          setBannerSize(size);
        }
      } catch {
        if (active) {
          setBannerSize(null);
        }
      }
    };

    void prepareBanner();

    return () => {
      active = false;
    };
  }, [containerWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width);

    setContainerWidth((currentWidth) =>
      currentWidth === width ? currentWidth : width
    );
  };

  return (
    <View
        style={[
            styles.container,
            { height: bannerSize?.height ?? FALLBACK_BANNER_HEIGHT },
        ]}
        onLayout={handleLayout}
    >
      {bannerSize ? (
        <BannerView
          size={bannerSize}
          adRequest={{ adUnitId: "demo-banner-yandex" }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});