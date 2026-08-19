import { Asset } from "expo-asset";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LaunchExperience from "../components/LaunchExperience";

type Phase = "idle" | "transforming" | "revealing" | "result";
type MessageKind = "prompt" | "answer";

type PreparedReaction = {
  image: ImageSourcePropType;
  answer: string;
};

type ReactionCategory = {
  id: string;
  image: ImageSourcePropType;
  answers: string[];
};

const UI_TEXT = {
  brand: "СПРОСИ ПСА",
  prompt: "Задай вопрос мысленно.\nЯ уже знаю ответ.",
  button: "Спросить пса",
  processing: "Сверяюсь со звёздами…",
  askAgain: "Спросить снова",
};

const AD_BANNER_RESERVED_HEIGHT = 58;

const bulldog = require("../assets/images/bulldog.png");
const bulldogBlink = require("../assets/images/bulldog_blink.png");
const background = require("../assets/images/background.png");

const reactionImages = {
  approves_with_reservations: require("../assets/images/reactions/approves_with_reservations.png"),
  hard_no: require("../assets/images/reactions/hard_no.png"),
  cringe: require("../assets/images/reactions/cringe.png"),
  chaos: require("../assets/images/reactions/chaos.png"),
  fate: require("../assets/images/reactions/fate.png"),
  consequences: require("../assets/images/reactions/consequences.png"),
  suspicious_respect: require("../assets/images/reactions/suspicious_respect.png"),
};

const REACTIONS: ReactionCategory[] = [
  {
    id: "approves_with_reservations",
    image: reactionImages.approves_with_reservations,
    answers: [
      "Ну типа да,\nно без гарантий",
      "Можно, но будет мемно",
      "Да, но потом не ной",
      "Сомнительно,\nно окей",
      "Можно. А зачем?",
      "Судьба сказала:\n«ну ладно»",
      "А, втф, ну допустим",
    ],
  },
  {
    id: "hard_no",
    image: reactionImages.hard_no,
    answers: ["Не вывезешь", "Нет, но я понимаю", "Не в этой реальности"],
  },
  {
    id: "cringe",
    image: reactionImages.cringe,
    answers: [
      "Это кринж,\nно рабочий",
      "Это будет неловко",
      "Пёс завис от кринжа",
      "Тот самый момент,\nкогда лучше\nне спрашивать",
    ],
  },
  {
    id: "chaos",
    image: reactionImages.chaos,
    answers: [
      "Это будет\nлибо успех,\nлибо контент",
      "Будет либо рост,\nлибо цирк",
      "Это билет в цирк",
      "Это звучит\nкак начало\nпроблемного рилса",
    ],
  },
  {
    id: "fate",
    image: reactionImages.fate,
    answers: [
      "Ну это судьба уже",
      "Карма сказала «погнали»",
      "Слишком поздно отступать",
      "Уже поздно быть нормальным",
    ],
  },
  {
    id: "consequences",
    image: reactionImages.consequences,
    answers: [
      "Пахнет последствиями",
      "Сначала будет смешно,\nпотом терапия",
      "Да, но без свидетелей",
    ],
  },
  {
    id: "suspicious_respect",
    image: reactionImages.suspicious_respect,
    answers: [
      "Момент сомнительный,\nпотенциал огромный",
      "Спроси ещё раз после кофе",
      "Ты точно хочешь этот квест?",
      "Данил Колбасенко знает",
    ],
  },
];

const PARTICLES = [
  { angle: -2.72, radius: 0.43, size: 6, color: "#F3D7FF" },
  { angle: -2.18, radius: 0.34, size: 8, color: "#B78CFF" },
  { angle: -1.57, radius: 0.44, size: 5, color: "#FFFFFF" },
  { angle: -0.92, radius: 0.36, size: 7, color: "#73E4FF" },
  { angle: -0.22, radius: 0.42, size: 5, color: "#EAB9FF" },
  { angle: 0.42, radius: 0.35, size: 8, color: "#8CDFFF" },
  { angle: 1.06, radius: 0.43, size: 6, color: "#FFFFFF" },
  { angle: 1.66, radius: 0.36, size: 7, color: "#D8A7FF" },
  { angle: 2.22, radius: 0.44, size: 5, color: "#82E4FF" },
  { angle: 2.78, radius: 0.33, size: 8, color: "#F2C7FF" },
] as const;

const shuffle = <T,>(items: T[]) => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
};

const runAnimation = (animation: Animated.CompositeAnimation) =>
  new Promise<boolean>((resolve) => {
    animation.start(({ finished }) => resolve(finished));
  });

const waitForNextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

export default function Index() {
  const { width, height } = useWindowDimensions();
  const isAndroid = Platform.OS === "android";

  const isCompact = height < 720;
  const artboardSize = Math.min(
    width - 32,
    height * (isCompact ? 0.4 : 0.43),
    380,
  );
  const orbSize = artboardSize * 0.48;

  const [phase, setPhase] = useState<Phase>("idle");
  const [currentImage, setCurrentImage] =
    useState<ImageSourcePropType>(bulldog);
  const [displayMessage, setDisplayMessage] = useState(UI_TEXT.prompt);
  const [messageKind, setMessageKind] = useState<MessageKind>("prompt");
  const [preloadImage, setPreloadImage] = useState<ImageSourcePropType | null>(
    null,
  );
  const [isNextImageReady, setIsNextImageReady] = useState(!isAndroid);
  const [isOrbReady, setIsOrbReady] = useState(!isAndroid);
  const startupIsReady = isNextImageReady && isOrbReady;

  const isAnimatingRef = useRef(false);
  const orbRef = useRef<LottieView>(null);
  const preparedReactionRef = useRef<PreparedReaction | null>(null);
  const initialReactionPreparedRef = useRef(false);
  const orbWarmupStartedRef = useRef(false);
  const orbWarmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryBagRef = useRef<number[]>([]);
  const lastCategoryIdRef = useRef<string | null>(null);
  const lastAnswerByCategoryRef = useRef<Record<string, number>>({});

  // Idle/result character motion.
  const floatY = useRef(new Animated.Value(0)).current;
  const blinkOpacity = useRef(new Animated.Value(0)).current;

  // Currently visible character.
  const currentOpacity = useRef(new Animated.Value(1)).current;
  const currentScale = useRef(new Animated.Value(1)).current;
  const currentTranslateY = useRef(new Animated.Value(0)).current;

  // Magic layers.
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0.65)).current;
  const fogOpacity = useRef(new Animated.Value(0)).current;
  const fogScale = useRef(new Animated.Value(0.64)).current;
  const fogDrift = useRef(new Animated.Value(0)).current;
  const particleProgress = useRef(new Animated.Value(0)).current;
  const sceneGlowOpacity = useRef(new Animated.Value(0.12)).current;

  // Prompt/result text.
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const messageTranslateY = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(1)).current;
  const buttonPulse = useRef(new Animated.Value(0)).current;

  const isAnimating = phase === "transforming" || phase === "revealing";
  const isButtonDisabled =
    isAnimating || (isAndroid && (!isOrbReady || !isNextImageReady));
  const showBlink = phase === "idle" && currentImage === bulldog;

  useEffect(() => {
    Asset.loadAsync([
      bulldog,
      bulldogBlink,
      ...Object.values(reactionImages),
    ]).catch(() => {
      // Local assets will still load normally if eager preloading is not
      // available on a particular platform.
    });
  }, []);

  useEffect(() => {
    if (phase !== "idle" && phase !== "result") {
      floatY.stopAnimation();
      floatY.setValue(0);
      return;
    }

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -6,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    floatAnimation.start();
    return () => floatAnimation.stop();
  }, [floatY, phase]);

  useEffect(() => {
    if (!showBlink) {
      blinkOpacity.setValue(0);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const delay = 2600 + Math.random() * 3000;

      timer = setTimeout(() => {
        if (!active) return;

        Animated.sequence([
          Animated.timing(blinkOpacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(blinkOpacity, {
            toValue: 0,
            duration: 110,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (active) scheduleBlink();
        });
      }, delay);
    };

    scheduleBlink();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [blinkOpacity, showBlink]);

  useEffect(() => {
    if (isButtonDisabled) {
      buttonPulse.stopAnimation();
      buttonPulse.setValue(0);
      return;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [buttonPulse, isButtonDisabled]);

  const getNextReaction = (): PreparedReaction => {
    if (categoryBagRef.current.length === 0) {
      const freshBag = shuffle(REACTIONS.map((_, index) => index));

      // At the boundary between two bags, the first category of the new bag
      // must not repeat the category that has just been shown.
      if (
        freshBag.length > 1 &&
        REACTIONS[freshBag[0]].id === lastCategoryIdRef.current
      ) {
        const replacementIndex = freshBag.findIndex(
          (categoryIndex) =>
            REACTIONS[categoryIndex].id !== lastCategoryIdRef.current,
        );

        [freshBag[0], freshBag[replacementIndex]] = [
          freshBag[replacementIndex],
          freshBag[0],
        ];
      }

      categoryBagRef.current = freshBag;
    }

    const categoryIndex = categoryBagRef.current.shift() ?? 0;
    const selectedCategory = REACTIONS[categoryIndex];
    const previousAnswerIndex =
      lastAnswerByCategoryRef.current[selectedCategory.id];

    let selectedAnswerIndex = Math.floor(
      Math.random() * selectedCategory.answers.length,
    );

    if (
      selectedCategory.answers.length > 1 &&
      selectedAnswerIndex === previousAnswerIndex
    ) {
      selectedAnswerIndex =
        (selectedAnswerIndex +
          1 +
          Math.floor(Math.random() * (selectedCategory.answers.length - 1))) %
        selectedCategory.answers.length;
    }

    lastCategoryIdRef.current = selectedCategory.id;
    lastAnswerByCategoryRef.current[selectedCategory.id] = selectedAnswerIndex;

    return {
      image: selectedCategory.image,
      answer: selectedCategory.answers[selectedAnswerIndex],
    };
  };

  useEffect(() => {
    if (initialReactionPreparedRef.current) return;
    initialReactionPreparedRef.current = true;

    const firstReaction = getNextReaction();
    preparedReactionRef.current = firstReaction;
    setIsNextImageReady(false);
    setPreloadImage(firstReaction.image);
  }, []);

  useEffect(() => {
    return () => {
      if (orbWarmupTimerRef.current) {
        clearTimeout(orbWarmupTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Never strand the user on the splash screen if an asset callback is
    // missed on an unusual device. Normal startup hides it much earlier.
    const safetyTimer = setTimeout(() => {
      setIsNextImageReady(true);
      setIsOrbReady(true);
    }, 4500);

    return () => clearTimeout(safetyTimer);
  }, []);

  const prepareFollowingReaction = () => {
    const followingReaction = getNextReaction();
    preparedReactionRef.current = followingReaction;
    setIsNextImageReady(false);
    setPreloadImage(followingReaction.image);
  };

  const handleOrbLoaded = () => {
    if (!isAndroid || orbWarmupStartedRef.current) return;

    orbWarmupStartedRef.current = true;

    requestAnimationFrame(() => {
      // This runs only after Lottie confirms that its composition is ready.
      // orbOpacity is still 0, so the user never sees the warm-up frames.
      orbRef.current?.reset();
      orbRef.current?.play(0, 14);

      orbWarmupTimerRef.current = setTimeout(() => {
        orbRef.current?.pause();
        orbRef.current?.reset();
        orbWarmupTimerRef.current = null;
        setIsOrbReady(true);
      }, 680);
    });
  };

  const resetMagicValues = () => {
    orbOpacity.setValue(0);
    orbScale.setValue(0.65);
    fogOpacity.setValue(0);
    fogScale.setValue(0.64);
    fogDrift.setValue(0);
    particleProgress.setValue(0);
  };

  const getAnswer = async () => {
    if (
      isAnimatingRef.current ||
      (isAndroid && (!isOrbReady || !isNextImageReady))
    ) {
      return;
    }

    isAnimatingRef.current = true;
    const nextReaction = preparedReactionRef.current ?? getNextReaction();
    preparedReactionRef.current = null;

    floatY.stopAnimation();
    floatY.setValue(0);
    resetMagicValues();

    currentOpacity.setValue(1);
    currentScale.setValue(1);
    currentTranslateY.setValue(0);

    setPhase("transforming");
    // The Lottie stays mounted and decoded; only playback starts on tap.
    // This avoids mounting and decoding the embedded PNG sequence during the
    // interaction.
    orbRef.current?.reset();
    orbRef.current?.play();

    // 0-620 ms: the orb wakes first, then pulls the dog into its center.
    // The dog disappears while it is still readable instead of shrinking
    // into a tiny sticker.
    await runAnimation(
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: -8,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(currentScale, {
            toValue: 1.025,
            duration: 140,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(currentScale, {
            toValue: 0.55,
            duration: 480,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(currentTranslateY, {
            toValue: artboardSize * 0.15,
            duration: 520,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(currentOpacity, {
          toValue: 0,
          duration: 320,
          delay: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(orbScale, {
            toValue: 0.92,
            duration: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(orbScale, {
            toValue: 1.3,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(fogOpacity, {
          toValue: 0.28,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fogScale, {
          toValue: 1.12,
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fogDrift, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(particleProgress, {
          toValue: 0.58,
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sceneGlowOpacity, {
          toValue: 0.38,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    // 620-710 ms: the bright organic centre of the Lottie hides the source
    // swap. No extra circular React Native bloom is layered on top.
    await runAnimation(Animated.delay(isAndroid ? 45 : 90));

    // Swap the source exactly at peak bloom while the character is invisible.
    setCurrentImage(nextReaction.image);
    currentOpacity.setValue(0);
    currentScale.setValue(0.84);
    currentTranslateY.setValue(artboardSize * 0.04);

    // The new text is prepared while invisible as well.
    setDisplayMessage(nextReaction.answer);
    setMessageKind("answer");
    messageOpacity.setValue(0);
    messageTranslateY.setValue(12);
    messageScale.setValue(0.97);
    setPhase("revealing");
    await waitForNextFrame();

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );

    // 710-1080 ms: the same continuous motion opens outward and reveals the
    // new reaction. No hold between bloom and character appearance.
    await runAnimation(
      Animated.parallel([
        Animated.timing(fogOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fogScale, {
          toValue: 1.28,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(particleProgress, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        isAndroid
          ? Animated.sequence([
              // Android needs a short clean handoff: first let the bright
              // Lottie core dissolve, then reveal the new bitmap.
              Animated.delay(60),
              Animated.parallel([
                Animated.timing(currentOpacity, {
                  toValue: 1,
                  duration: 230,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(currentScale, {
                  toValue: 1,
                  duration: 270,
                  easing: Easing.out(Easing.back(1.08)),
                  useNativeDriver: true,
                }),
                Animated.timing(currentTranslateY, {
                  toValue: 0,
                  duration: 250,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
            ])
          : Animated.parallel([
              Animated.timing(currentOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(currentScale, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.back(1.08)),
                useNativeDriver: true,
              }),
              Animated.timing(currentTranslateY, {
                toValue: 0,
                duration: 280,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
        Animated.sequence([
          Animated.delay(130),
          Animated.parallel([
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 230,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(messageTranslateY, {
              toValue: 0,
              duration: 240,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(messageScale, {
              toValue: 1,
              duration: 240,
              easing: Easing.out(Easing.back(1.04)),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(orbOpacity, {
          toValue: 0,
          duration: isAndroid ? 170 : 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sceneGlowOpacity, {
          toValue: 0.16,
          duration: 340,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    orbRef.current?.pause();
    setPhase("result");
    isAnimatingRef.current = false;
    prepareFollowingReaction();
  };

  const buttonTitle =
    phase === "transforming" || (isAndroid && phase === "revealing")
      ? UI_TEXT.processing
      : phase === "revealing" || phase === "result"
        ? UI_TEXT.askAgain
        : UI_TEXT.button;

  const handleButtonPressIn = () => {
    if (isButtonDisabled) return;

    // Give immediate feedback on touch-down. The answer still starts on
    // release, so a user can cancel the gesture by moving the finger away.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const fogTranslateX = fogDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 18],
  });

  const fogTranslateY = fogDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -8],
  });

  const buttonAuraOpacity = buttonPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.3],
  });

  const buttonAuraScale = buttonPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.06],
  });

  return (
    <ImageBackground
      source={background}
      resizeMode="cover"
      style={styles.container}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View pointerEvents="none" style={styles.backgroundTint} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.brand}>{UI_TEXT.brand}</Text>
        </View>

        <View style={styles.mainContent}>
          <View
            style={[
              styles.characterArea,
              {
                width: artboardSize,
                height: artboardSize,
              },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sceneGlow,
                {
                  opacity: sceneGlowOpacity,
                  width: artboardSize * 0.78,
                  height: artboardSize * 0.48,
                  borderRadius: artboardSize,
                },
              ]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.characterLayer,
                {
                  opacity: currentOpacity,
                  transform: [
                    {
                      translateY: Animated.add(floatY, currentTranslateY),
                    },
                    { scale: currentScale },
                  ],
                },
              ]}
            >
              <Image
                source={currentImage}
                resizeMode="contain"
                fadeDuration={0}
                style={styles.characterImage}
              />

              {/* Keep the blink bitmap mounted. Removing it on the first tap
                  makes Android rebuild the whole character texture exactly
                  when Lottie starts, which causes a one-frame disappearance. */}
              <Animated.Image
                source={bulldogBlink}
                resizeMode="contain"
                fadeDuration={0}
                style={[
                  styles.characterImage,
                  styles.blinkImage,
                  { opacity: blinkOpacity },
                ]}
              />
            </Animated.View>

            <View pointerEvents="none" style={styles.magicLayer}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.magicFog,
                  styles.magicFogBack,
                  {
                    width: artboardSize * 0.8,
                    height: artboardSize * 0.42,
                    left: artboardSize * 0.1,
                    top: artboardSize * 0.4,
                    borderRadius: artboardSize,
                    opacity: fogOpacity,
                    transform: [
                      { translateX: fogTranslateX },
                      { translateY: fogTranslateY },
                      { rotate: "-10deg" },
                      { scale: fogScale },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(107, 70, 221, 0.02)",
                    "rgba(194, 126, 255, 0.3)",
                    "rgba(91, 218, 255, 0.04)",
                  ]}
                  start={{ x: 0, y: 0.35 }}
                  end={{ x: 1, y: 0.65 }}
                  style={styles.magicFogFill}
                />
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.magicFog,
                  styles.magicFogFront,
                  {
                    width: artboardSize * 0.62,
                    height: artboardSize * 0.3,
                    left: artboardSize * 0.19,
                    top: artboardSize * 0.49,
                    borderRadius: artboardSize,
                    opacity: fogOpacity,
                    transform: [
                      { translateX: Animated.multiply(fogTranslateX, -0.55) },
                      { translateY: Animated.multiply(fogTranslateY, 0.45) },
                      { rotate: "12deg" },
                      { scale: fogScale },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255, 255, 255, 0.01)",
                    "rgba(129, 222, 255, 0.22)",
                    "rgba(226, 169, 255, 0.06)",
                  ]}
                  start={{ x: 0, y: 0.25 }}
                  end={{ x: 1, y: 0.75 }}
                  style={styles.magicFogFill}
                />
              </Animated.View>

              <View pointerEvents="none" style={styles.particleLayer}>
                {PARTICLES.map((particle, index) => {
                  const radius = artboardSize * particle.radius;
                  const turnAngle = particle.angle + 0.78;
                  const burstAngle = particle.angle + 1.08;

                  const translateX = particleProgress.interpolate({
                    inputRange: [0, 0.12, 0.58, 1],
                    outputRange: [
                      Math.cos(particle.angle) * radius * 1.08,
                      Math.cos(turnAngle) * radius * 0.82,
                      0,
                      Math.cos(burstAngle) * radius * 1.22,
                    ],
                  });

                  const translateY = particleProgress.interpolate({
                    inputRange: [0, 0.12, 0.58, 1],
                    outputRange: [
                      Math.sin(particle.angle) * radius * 0.82,
                      Math.sin(turnAngle) * radius * 0.62,
                      0,
                      Math.sin(burstAngle) * radius * 0.94,
                    ],
                  });

                  const opacity = particleProgress.interpolate({
                    inputRange: [0, 0.12, 0.58, 0.82, 1],
                    outputRange: [0, 0.86, 1, 0.68, 0],
                  });

                  const scale = particleProgress.interpolate({
                    inputRange: [0, 0.12, 0.58, 1],
                    outputRange: [0.35, 1, 0.72, 0.2],
                  });

                  return (
                    <Animated.View
                      key={`${particle.angle}-${index}`}
                      style={[
                        styles.magicParticle,
                        {
                          width: particle.size,
                          height: particle.size * 1.7,
                          borderRadius: particle.size / 2,
                          backgroundColor: particle.color,
                          left: artboardSize / 2 - particle.size / 2,
                          top: artboardSize * 0.7 - (particle.size * 1.7) / 2,
                          opacity,
                          transform: [
                            { translateX },
                            { translateY },
                            { rotate: `${particle.angle + Math.PI / 2}rad` },
                            { scale },
                          ],
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.orbWrap,
                  {
                    width: orbSize,
                    height: orbSize,
                    left: (artboardSize - orbSize) / 2,
                    top: artboardSize * 0.46,
                    opacity: orbOpacity,
                    transform: [{ scale: orbScale }],
                  },
                ]}
              >
                <LottieView
                  ref={orbRef}
                  source={require("../assets/lottie/orb.json")}
                  autoPlay={false}
                  loop={false}
                  speed={isAndroid ? 0.84 : 0.76}
                  renderMode={isAndroid ? "SOFTWARE" : "AUTOMATIC"}
                  cacheComposition
                  onAnimationLoaded={handleOrbLoaded}
                  onAnimationFailure={() => setIsOrbReady(true)}
                  style={styles.orbLottie}
                />
              </Animated.View>
            </View>

            {preloadImage && (
              <Image
                key={`preload-${String(preloadImage)}`}
                source={preloadImage}
                resizeMode="contain"
                fadeDuration={0}
                onLoad={() => setIsNextImageReady(true)}
                onError={() => setIsNextImageReady(true)}
                style={styles.preloadImage}
              />
            )}
          </View>

          <View
            style={[styles.messageSlot, isCompact && styles.messageSlotCompact]}
          >
            <Animated.View
              style={[
                styles.messageSurface,
                {
                  opacity: messageOpacity,
                  transform: [
                    { translateY: messageTranslateY },
                    { scale: messageScale },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.message,
                  messageKind === "answer"
                    ? styles.answerText
                    : styles.promptText,
                ]}
              >
                {displayMessage}
              </Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={buttonTitle}
            accessibilityState={{ disabled: isButtonDisabled }}
            disabled={isButtonDisabled}
            onPressIn={handleButtonPressIn}
            onPress={getAnswer}
            hitSlop={8}
            style={({ pressed }) => [
              styles.buttonShell,
              isButtonDisabled &&
                (isAndroid
                  ? styles.buttonDisabledAndroid
                  : styles.buttonDisabled),
              pressed && !isButtonDisabled && styles.buttonPressed,
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.buttonAura,
                {
                  opacity:
                    isAndroid && isButtonDisabled ? 0 : buttonAuraOpacity,
                  transform: [
                    {
                      scale:
                        isAndroid && isButtonDisabled ? 1 : buttonAuraScale,
                    },
                  ],
                },
              ]}
            />

            <LinearGradient
              colors={
                isAnimating
                  ? ["#54456E", "#302744", "#54456E"]
                  : ["#7657FF", "#D25BFF", "#63DDF5"]
              }
              start={{ x: 0, y: 0.25 }}
              end={{ x: 1, y: 0.75 }}
              style={styles.buttonBorder}
            >
              <View style={styles.buttonInner}>
                <View style={styles.buttonInnerGlow} />
                <Text style={styles.buttonText}>{buttonTitle}</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Replace this view with the ad banner component later. */}
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.adBannerSlot}
          />
        </View>
      </SafeAreaView>

      <LaunchExperience ready={startupIsReady} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09051C",
  },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 4, 27, 0.18)",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 6,
  },
  header: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 0.34)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  characterArea: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  sceneGlow: {
    position: "absolute",
    top: "35%",
    left: "11%",
    backgroundColor: "rgba(180, 117, 255, 0.22)",
    shadowColor: "#C693FF",
    shadowOpacity: 0.52,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  characterLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  characterImage: {
    position: "absolute",
    top: "-8%",
    left: "-8%",
    width: "116%",
    height: "116%",
  },
  preloadImage: {
    position: "absolute",
    top: "-8%",
    left: "-8%",
    width: "116%",
    height: "116%",
    opacity: 0.001,
    zIndex: 1,
  },
  blinkImage: {
    zIndex: 2,
  },
  magicLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  orbWrap: {
    position: "absolute",
    zIndex: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    shadowColor: "#DAA5FF",
    shadowOpacity: 0.72,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  orbLottie: {
    width: "100%",
    height: "100%",
  },
  magicFog: {
    position: "absolute",
    overflow: "hidden",
  },
  magicFogBack: {
    zIndex: 4,
    shadowColor: "#BA80FF",
    shadowOpacity: 0.48,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  magicFogFront: {
    zIndex: 7,
    shadowColor: "#7DE5FF",
    shadowOpacity: 0.34,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  magicFogFill: {
    flex: 1,
    borderRadius: 999,
  },
  particleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  magicParticle: {
    position: "absolute",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.8,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  messageSlot: {
    width: "100%",
    maxWidth: 350,
    minHeight: 112,
    marginTop: -8,
    alignItems: "center",
    justifyContent: "center",
  },
  messageSlotCompact: {
    minHeight: 96,
    marginTop: -14,
  },
  messageSurface: {
    width: "100%",
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  message: {
    textAlign: "center",
    color: "#FFFFFF",
    textShadowColor: "rgba(33, 9, 70, 0.86)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  promptText: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: "600",
    color: "#EEE9FF",
  },
  answerText: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.45,
    maxWidth: 340,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  adBannerSlot: {
    width: "100%",
    height: AD_BANNER_RESERVED_HEIGHT,
  },
  buttonShell: {
    position: "relative",
    width: 280,
    height: 60,
    alignSelf: "center",
    borderRadius: 999,
    shadowColor: "#A66BFF",
    shadowOpacity: 0.44,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  buttonBorder: {
    flex: 1,
    width: "100%",
    padding: 1.25,
    borderRadius: 999,
    zIndex: 1,
  },
  buttonAura: {
    position: "absolute",
    top: -7,
    right: -10,
    bottom: -7,
    left: -10,
    borderRadius: 999,
    backgroundColor: "#A669FF",
  },
  buttonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(8, 5, 24, 0.93)",
  },
  buttonInnerGlow: {
    position: "absolute",
    top: -14,
    right: 28,
    left: 28,
    height: 32,
    borderRadius: 20,
    backgroundColor: "rgba(183, 113, 255, 0.12)",
  },
  buttonPressed: {
    transform: [{ scale: 0.955 }],
    shadowOpacity: 0.72,
    shadowRadius: 30,
  },
  buttonDisabled: {
    opacity: 0.52,
    shadowOpacity: 0.12,
  },
  buttonDisabledAndroid: {
    shadowOpacity: 0.12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
});
