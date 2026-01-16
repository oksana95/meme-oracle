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

export default function Index() {
  const [message, setMessage] = useState("Нажми на кнопку, чтобы получить ответ");

const lang = useMemo<Lang>(() => {
  const deviceLang = Localization.getLocales()[0]?.languageCode; // "en", "ru", ...
  return deviceLang === 'ru' ? 'ru' : 'en';
}, []);



  const getRandomAnswer = () => {
  const randomIndex = Math.floor(Math.random() * answersData.length);
  const item = answersData[randomIndex];
  return item ? item[lang as Lang] : '…';
};


  const getAnswer = () => {
    setMessage(getRandomAnswer());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Мемный шар 🎱</Text>
      <Text style={styles.message}>{message}</Text>
      <Button title="Спроси шар" onPress={getAnswer} />
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
