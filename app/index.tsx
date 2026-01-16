import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const [message, setMessage] = useState("Нажми на кнопку, чтобы получить ответ");

  const answers = [
    "Да 😂",
    "Нет 🙀",
    "Может быть 🤔",
    "Попробуй позже 🐾",
    "100% да! 🚀",
    "Даже не думай 😼",
  ];

  const getAnswer = () => {
    const randomIndex = Math.floor(Math.random() * answers.length);
    setMessage(answers[randomIndex]);
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
