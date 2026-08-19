// MEME_ORACLE_UPDATE: splash-fix-2026-08-18-v2
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LaunchExperienceProps = {
  ready: boolean;
};

const MIN_VISIBLE_MS = 1700;
const CONTENT_EXIT_DURATION_MS = 180;
const BLOOM_IN_DURATION_MS = 110;
const REVEAL_DURATION_MS = 260;

const background = require("../assets/images/background.png");
// Используем тот же образ бульдога, что и в иконке приложения.
const mascot = require("../assets/images/launch-mascot.png");

export default function LaunchExperience({ ready }: LaunchExperienceProps) {
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const mascotSize = Math.min(width * 0.7, 264);

  const [visible, setVisible] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);
  const [assetsPrepared, setAssetsPrepared] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [mascotReady, setMascotReady] = useState(false);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const nativeSplashHiddenRef = useRef(false);
  const introStartedRef = useRef(false);
  const exitStartedRef = useRef(false);

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.97)).current;
  const contentTranslateY = useRef(new Animated.Value(7)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyTranslateY = useRef(new Animated.Value(6)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const sparklePulse = useRef(new Animated.Value(0)).current;
  const transitionBloomOpacity = useRef(new Animated.Value(0)).current;

  const visualReady =
    layoutReady && assetsPrepared && backgroundReady && mascotReady;

  useEffect(() => {
    let active = true;

    Asset.loadAsync([background, mascot])
      .catch(() => {
        // Image components below still provide a safe fallback via onLoadEnd.
      })
      .finally(() => {
        if (active) setAssetsPrepared(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visualReady) return;

    // Visibility is measured from the moment the complete branded screen is
    // actually ready, not from component mount while Expo is loading assets.
    setMinimumTimeElapsed(false);

    const minimumTimer = setTimeout(
      () => setMinimumTimeElapsed(true),
      MIN_VISIBLE_MS,
    );

    return () => {
      clearTimeout(minimumTimer);
    };
  }, [visualReady]);

  useEffect(() => {
    if (!visualReady || nativeSplashHiddenRef.current) return;

    nativeSplashHiddenRef.current = true;

    if (Platform.OS !== "web") {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [visualReady]);

  useEffect(() => {
    if (!visualReady || introStartedRef.current) return;

    introStartedRef.current = true;

    if (reduceMotion) {
      contentOpacity.setValue(1);
      contentScale.setValue(1);
      contentTranslateY.setValue(0);
      copyOpacity.setValue(1);
      copyTranslateY.setValue(0);
      return;
    }

    const intro = Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(90),
        Animated.parallel([
          Animated.timing(copyOpacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(copyTranslateY, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sparklePulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    intro.start();
    glowLoop.start();
    sparkleLoop.start();

    return () => {
      intro.stop();
      glowLoop.stop();
      sparkleLoop.stop();
    };
  }, [
    contentOpacity,
    contentScale,
    contentTranslateY,
    copyOpacity,
    copyTranslateY,
    glowPulse,
    reduceMotion,
    sparklePulse,
    visualReady,
  ]);

  useEffect(() => {
    if (
      !ready ||
      !visualReady ||
      !minimumTimeElapsed ||
      exitStartedRef.current
    ) {
      return;
    }

    exitStartedRef.current = true;
    glowPulse.stopAnimation();
    sparklePulse.stopAnimation();

    const exit = reduceMotion
      ? Animated.sequence([
          Animated.timing(contentOpacity, {
            toValue: 0,
            duration: 100,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 160,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      : Animated.sequence([
          // Hide the launch mascot before revealing the main character so the
          // two bulldogs can never appear on top of each other.
          Animated.timing(contentOpacity, {
            toValue: 0,
            duration: CONTENT_EXIT_DURATION_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(transitionBloomOpacity, {
            toValue: 1,
            duration: BLOOM_IN_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: REVEAL_DURATION_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(transitionBloomOpacity, {
              toValue: 0,
              duration: REVEAL_DURATION_MS,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]);

    exit.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => exit.stop();
  }, [
    contentOpacity,
    glowPulse,
    minimumTimeElapsed,
    overlayOpacity,
    ready,
    reduceMotion,
    sparklePulse,
    transitionBloomOpacity,
    visualReady,
  ]);

  if (!visible) return null;

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0.56],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.04],
  });

  const primarySparkleOpacity = sparklePulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.28, 0.92, 0.28],
  });

  const secondarySparkleOpacity = sparklePulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.72, 0.24, 0.72],
  });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { opacity: overlayOpacity }]}
    >
      <ImageBackground
        source={background}
        resizeMode="cover"
        onLoadEnd={() => setBackgroundReady(true)}
        onError={() => setBackgroundReady(true)}
        style={styles.background}
      >
        <View pointerEvents="none" style={styles.backgroundTint} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.transitionBloom,
            { opacity: transitionBloomOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              "rgba(152, 94, 255, 0)",
              "rgba(221, 178, 255, 0.42)",
              "rgba(93, 222, 255, 0)",
            ]}
            start={{ x: 0, y: 0.25 }}
            end={{ x: 1, y: 0.75 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              "rgba(111, 67, 231, 0)",
              "rgba(198, 128, 255, 0.3)",
              "rgba(111, 67, 231, 0)",
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <SafeAreaView
          onLayout={() => setLayoutReady(true)}
          style={styles.safeArea}
        >
          <Animated.View
            style={[
              styles.content,
              compact && styles.contentCompact,
              {
                opacity: contentOpacity,
                transform: [
                  { translateY: contentTranslateY },
                  { scale: contentScale },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.mascotStage,
                { width: mascotSize, height: mascotSize },
              ]}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.glow,
                  {
                    opacity: glowOpacity,
                    transform: [{ scale: glowScale }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(146, 72, 255, 0)",
                    "rgba(169, 103, 255, 0.46)",
                    "rgba(91, 222, 255, 0)",
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.glowHorizontal}
                />
                <LinearGradient
                  colors={[
                    "rgba(111, 65, 226, 0)",
                    "rgba(197, 126, 255, 0.32)",
                    "rgba(87, 222, 255, 0)",
                  ]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.glowVertical}
                />
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sparkle,
                  styles.sparkleTopLeft,
                  { opacity: primarySparkleOpacity },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sparkle,
                  styles.sparkleTopRight,
                  { opacity: secondarySparkleOpacity },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sparkle,
                  styles.sparkleBottomRight,
                  { opacity: primarySparkleOpacity },
                ]}
              />

              <Image
                source={mascot}
                resizeMode="contain"
                fadeDuration={0}
                onLoadEnd={() => setMascotReady(true)}
                onError={() => setMascotReady(true)}
                style={styles.mascot}
              />
            </View>

            <Animated.View
              style={[
                styles.copy,
                {
                  opacity: copyOpacity,
                  transform: [{ translateY: copyTranslateY }],
                },
              ]}
            >
              <Text style={styles.title}>СПРОСИ ПСА</Text>
              <Text style={styles.tagline}>
                Задай вопрос, но потом не жалуйся
              </Text>
            </Animated.View>
          </Animated.View>

        </SafeAreaView>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "#09051C",
  },
  background: {
    flex: 1,
    backgroundColor: "#09051C",
  },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 4, 27, 0.18)",
  },
  transitionBloom: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 34,
  },
  contentCompact: {
    paddingBottom: 8,
  },
  mascotStage: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: {
    width: "100%",
    height: "100%",
  },
  glow: {
    position: "absolute",
    top: "15%",
    right: "3%",
    bottom: "5%",
    left: "3%",
  },
  glowHorizontal: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  glowVertical: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  sparkle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: "#F3E7FF",
    transform: [{ rotate: "45deg" }],
  },
  sparkleTopLeft: {
    top: "23%",
    left: "9%",
  },
  sparkleTopRight: {
    top: "16%",
    right: "12%",
    width: 4,
    height: 4,
    backgroundColor: "#81E4FF",
  },
  sparkleBottomRight: {
    right: "5%",
    bottom: "29%",
    width: 5,
    height: 5,
    backgroundColor: "#DFA9FF",
  },
  copy: {
    alignItems: "center",
    marginTop: -4,
    paddingHorizontal: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: 1.7,
    textAlign: "center",
    textShadowColor: "rgba(40, 12, 78, 0.72)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  tagline: {
    maxWidth: 310,
    marginTop: 8,
    color: "rgba(239, 232, 255, 0.82)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
    textAlign: "center",
    textShadowColor: "rgba(21, 7, 47, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
