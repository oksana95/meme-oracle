import { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
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
const TEST_BANNER_AD_UNIT_ID = "demo-banner-yandex";

const bannerAdUnitId =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_YANDEX_BANNER_IOS_ID,
    android: process.env.EXPO_PUBLIC_YANDEX_BANNER_ANDROID_ID,
  }) ?? TEST_BANNER_AD_UNIT_ID;

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
          adRequest={{ adUnitId: bannerAdUnitId }}
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
