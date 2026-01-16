import * as Localization from 'expo-localization';
import React, { useMemo, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import answersDataRaw from '../assets/data/answers.json';

type Lang = 'ru' | 'en';

type AnswerItem = {
  id: number;
  ru: string;
  en: string;
};

const answersData = answersDataRaw as AnswerItem[];

const UI_TEXT: Record<Lang, { title: string; button: string; initial: string }> = {
  ru: {
    title: 'Мемный шар 🎱',
    button: 'Спроси шар',
    initial: 'Нажми на кнопку, чтобы получить ответ',
  },
  en: {
    title: 'Meme Oracle 🎱',
    button: 'Ask the oracle',
    initial: 'Tap the button to get an answer',
  },
};

export default function Index() {
  const lang = useMemo<Lang>(() => {
    const deviceLang = Localization.getLocales()[0]?.languageCode;
    return deviceLang === 'ru' ? 'ru' : 'en';
  }, []);

  const [message, setMessage] = useState(UI_TEXT[lang].initial);

  const getRandomAnswer = () => {
    const randomIndex = Math.floor(Math.random() * answersData.length);
    const item = answersData[randomIndex];
    return item ? item[lang] : '…';
  };

  const getAnswer = () => {
    setMessage(getRandomAnswer());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{UI_TEXT[lang].title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Button title={UI_TEXT[lang].button} onPress={getAnswer} />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  message: {
    fontSize: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
});
