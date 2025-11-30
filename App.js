# SoloLevelingApp (React Native, Expo)

This single-file starter project includes a complete React Native + Expo app skeleton for a personal "Solo Leveling"-style system. It contains:
- App.js (main app)
- package.json (dependencies + scripts)
- README with run/build instructions

---

## README

### Τι περιλαμβάνει
- Leveling engine (XP, level up, allocation points)
- Stats (STR / AGI / END / INT / LUCK) with allocation
- Quests (daily quests, one-time quests)
- Skills unlock on levels
- Persistence (AsyncStorage)
- Simple UI for mobile (Expo)

### Απαιτήσεις
- Node.js
- Expo CLI (`npm install -g expo-cli`) ή χρήση `npx expo` χωρίς global εγκατάσταση

### Εκτέλεση τοπικά (development)
1. Αποθήκευσε τα αρχεία σε έναν φάκελο, ή δημιούργησε project με `expo init` και επικόλλησε το `App.js`.
2. `npm install` (θα εγκαταστήσει τις εξαρτήσεις από package.json)
3. `npx expo start` -- σκανάρεις το QR με το Expo Go app στο κινητό ή τρέχεις emulator

### Για να δημιουργήσεις APK/IPA
- Μπορείς να χρησιμοποιήσεις `expo build:android` ή το νέο `eas build` ανάλογα με τις ανάγκες.

---

## package.json

```json
{
  "name": "sololeveling-app",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "^49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-native-async-storage/async-storage": "^1.20.1",
    "react-native-paper": "^5.6.0"
  }
}
```

> Σημείωση: Αν προτιμάς συγκεκριμένη έκδοση Expo/React Native, προσαρμόζεις.

---

## App.js

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Leveling engine and data model (Greek comments)

const DEFAULT_PLAYER = {
  level: 1,
  xp: 0,
  allocPoints: 0,
  stats: { STR: 5, AGI: 5, END: 5, INT: 5, LUCK: 1 },
  skills: [],
  quests: [],
  createdAt: Date.now(),
};

function xpToNext(level) {
  // Απλό curve: base 100 * level^1.2
  return Math.floor(100 * Math.pow(level, 1.2));
}

function earnXP(player, amount) {
  const newXP = player.xp + amount;
  let level = player.level;
  let xp = newXP;
  let alloc = player.allocPoints;

  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    alloc += 3; // points per level
  }

  return { ...player, xp, level, allocPoints: alloc };
}

const SAMPLE_QUESTS = [
  { id: 'q1', title: 'Walk 5000 steps', xp: 40, daily: true, done: false },
  { id: 'q2', title: 'Complete push workout', xp: 70, daily: true, done: false },
  { id: 'q3', title: 'Read 30 minutes', xp: 30, daily: true, done: false },
];

const SKILLS_BY_LEVEL = {
  2: [{ id: 's1', name: 'Power Strike', desc: 'Μικρή επίθεση για +damage' }],
  4: [{ id: 's2', name: 'Quickstep', desc: 'Αύξηση ταχύτητας για σύντομο διάστημα' }],
};

// --- App component

export default function App() {
  const [player, setPlayer] = useState(DEFAULT_PLAYER);
  const [loading, setLoading] = useState(true);
  const [newQuestTitle, setNewQuestTitle] = useState('');

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loading) save();
  }, [player]);

  async function load() {
    try {
      const raw = await AsyncStorage.getItem('@player');
      if (raw) {
        setPlayer(JSON.parse(raw));
      } else {
        setPlayer({ ...DEFAULT_PLAYER, quests: SAMPLE_QUESTS });
      }
    } catch (e) {
      console.warn('load error', e);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      await AsyncStorage.setItem('@player', JSON.stringify(player));
    } catch (e) {
      console.warn('save error', e);
    }
  }

  function addXP(amount) {
    const updated = earnXP(player, amount);
    // unlock skills based on level
    const unlocked = [];
    for (const lvl in SKILLS_BY_LEVEL) {
      if (updated.level >= Number(lvl)) {
        SKILLS_BY_LEVEL[lvl].forEach(s => {
          if (!updated.skills.find(x => x.id === s.id)) unlocked.push(s);
        });
      }
    }
    if (unlocked.length) updated.skills = [...updated.skills, ...unlocked];

    setPlayer(updated);
  }

  function allocateStat(stat) {
    if (player.allocPoints <= 0) return Alert.alert('No points', 'You have no allocation points');
    const newStats = { ...player.stats, [stat]: player.stats[stat] + 1 };
    setPlayer({ ...player, stats: newStats, allocPoints: player.allocPoints - 1 });
  }

  function completeQuest(qid) {
    const q = player.quests.find(x => x.id === qid);
    if (!q || q.done) return;
    const updated = { ...player };
    updated.quests = updated.quests.map(x => (x.id === qid ? { ...x, done: true } : x));
    const afterXP = earnXP(updated, q.xp);
    setPlayer(afterXP);
  }

  function addQuest() {
    if (!newQuestTitle.trim()) return;
    const q = { id: 'q' + Date.now(), title: newQuestTitle.trim(), xp: 50, daily: false, done: false };
    setPlayer({ ...player, quests: [...player.quests, q] });
    setNewQuestTitle('');
  }

  function resetDaily() {
    const q = player.quests.map(x => (x.daily ? { ...x, done: false } : x));
    setPlayer({ ...player, quests: q });
  }

  const progress = Math.min(1, player.xp / xpToNext(player.level));

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>SoloLeveling - Personal</Text>
      <View style={styles.row}>
        <View style={styles.card}>
          <Text>Level: {player.level}</Text>
          <Text>XP: {player.xp} / {xpToNext(player.level)}</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text>Alloc points: {player.allocPoints}</Text>
        </View>
        <View style={styles.card}>
          <Text style={{ fontWeight: 'bold' }}>Stats</Text>
          {Object.keys(player.stats).map(key => (
            <View key={key} style={styles.statRow}>
              <Text>{key}: {player.stats[key]}</Text>
              <Button title="+" onPress={() => allocateStat(key)} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Quests</Text>
        <FlatList
          data={player.quests}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={styles.questRow}>
              <Text>{item.title} {item.daily ? '(daily)' : ''} - {item.xp} XP</Text>
              <Button title={item.done ? 'Done' : 'Complete'} disabled={item.done} onPress={() => completeQuest(item.id)} />
            </View>
          )}
        />
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TextInput style={styles.input} placeholder="New quest" value={newQuestTitle} onChangeText={setNewQuestTitle} />
          <Button title="Add" onPress={addQuest} />
        </View>
        <View style={{ marginTop: 8 }}>
          <Button title="Reset daily quests" onPress={resetDaily} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Skills</Text>
        {player.skills.length === 0 ? <Text>No skills yet</Text> : player.skills.map(s => (
          <View key={s.id} style={styles.skillRow}>
            <Text style={{ fontWeight: '600' }}>{s.name}</Text>
            <Text>{s.desc}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 10 }}>
        <Button title="Simulate +50 XP" onPress={() => addXP(player, 50)} />
        <Button title="Simulate +200 XP" onPress={() => addXP(player, 200)} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9fb' },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  card: { flex: 1, padding: 10, backgroundColor: '#fff', borderRadius: 8, elevation: 2, marginBottom: 8 },
  progressBg: { height: 10, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden', marginTop: 6, marginBottom: 6 },
  progressFill: { height: 10, backgroundColor: '#4caf50' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  section: { marginTop: 12 },
  questRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: '#fff', marginTop: 6, borderRadius: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginRight: 8, backgroundColor: '#fff' },
  skillRow: { backgroundColor: '#fff', padding: 8, marginTop: 6, borderRadius: 6 }
});
```

---

## Τι μπορείς να προσθέσεις εύκολα (next steps)
- Notifications (expo-notifications) για daily quests
- Achievement system
- Visual effects και animations με Reanimated / Lottie
- Sync με cloud (Firebase) αν θέλεις multi-device
- Dark mode και themes

---

## Παρατήρηση
Αυτό είναι ένα *starter* project. Μπορείς να το επεκτείνεις σε full-featured app με menus, skill trees, perk systems, equipped items, inventory κλπ.

Καλή αρχή! Αν θέλεις, μπορώ να:
- Προσαρμόσω το leveling curve και το balance με βάση το στόχο σου
- Προσθέσω export σε APK ή .aab και οδηγίες βελτιστοποίησης
- Κάνω UI redesign

  
