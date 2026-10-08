import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

import { fetchPokemon } from './src/pokeapi';
import { identifyPokemon, localize } from './src/ai';
import { listVoices, setChosenVoice, setVoiceStyle, speakDex, stopSpeaking } from './src/voice';
import type { VoiceOption, VoiceStyle } from './src/voice';
import { T, TYPE_COLOR, typeLabel } from './src/i18n';
import { loadApiKey, loadLang, loadPref, saveApiKey, saveLang, savePref } from './src/storage';
import type { Lang, LocalizedText, PokemonInfo } from './src/types';

type Phase = 'idle' | 'scanning' | 'result' | 'message';

export default function App() {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [pokemon, setPokemon] = useState<PokemonInfo | null>(null);
  const [text, setText] = useState<LocalizedText | null>(null);
  const [lang, setLang] = useState<Lang>('pt');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const busy = useRef(false);
  const [vStyle, setVStyle] = useState<VoiceStyle>('robot');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  const t = T[lang];

  useEffect(() => {
    (async () => {
      setApiKey(await loadApiKey());
      const l = await loadLang();
      setLang(l);
      const st = ((await loadPref('voice_style')) as VoiceStyle) || 'robot';
      setVStyle(st);
      setVoiceStyle(st);
      for (const k of ['pt', 'en'] as Lang[]) setChosenVoice(k, (await loadPref(`voice_${k}`)) ?? undefined);
    })();
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    (async () => {
      setVoices(await listVoices(lang));
      setVoiceId(await loadPref(`voice_${lang}`));
    })();
  }, [showSettings, lang]);

  const pickVoice = async (id: string | null) => {
    setVoiceId(id);
    setChosenVoice(lang, id ?? undefined);
    await savePref(`voice_${lang}`, id);
    speakDex(lang === 'pt' ? 'Olá! Eu sou a Pokédex.' : 'Hello! I am the Pokédex.', lang);
  };

  const pickStyle = async (st: VoiceStyle) => {
    setVStyle(st);
    setVoiceStyle(st);
    await savePref('voice_style', st);
    speakDex(lang === 'pt' ? 'Olá! Eu sou a Pokédex.' : 'Hello! I am the Pokédex.', lang);
  };

  const buildSpeech = useCallback((p: PokemonInfo, loc: LocalizedText, l: Lang) => {
    const tt = T[l];
    const types = p.types.map((x) => typeLabel(x, l)).join(l === 'pt' ? ' e ' : ' and ');
    return [
      tt.voiceHeader(p.id, p.name),
      tt.voiceCategory(loc.genus),
      tt.voiceType(types),
      loc.description,
    ].join(' ');
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setPhase('message');
    speakDex(msg, lang);
  };

  const scan = async () => {
    if (busy.current || !camRef.current) return;
    if (!apiKey) {
      setShowSettings(true);
      setDraftKey('');
      return showMessage(t.needKey);
    }
    busy.current = true;
    stopSpeaking();
    setPhase('scanning');
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.7, skipProcessing: false });
      // reduz a imagem: mais rápido e mais barato
      const small = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 768 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!small.base64) throw new Error('no-base64');

      const det = await identifyPokemon(apiKey, small.base64);
      if (!det.slug || det.confidence < 0.4) {
        busy.current = false;
        return showMessage(t.notFound);
      }
      let info: PokemonInfo;
      try {
        info = await fetchPokemon(det.slug);
      } catch {
        busy.current = false;
        return showMessage(t.notFound);
      }
      const loc = await localize(apiKey, info, lang);
      setPokemon(info);
      setText(loc);
      setPhase('result');
      speakDex(buildSpeech(info, loc, lang), lang);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const m = msg === 'API_KEY_INVALID' ? t.keyInvalid : msg === 'RATE_LIMIT' ? t.rateLimit : t.error;
      showMessage(m);
    } finally {
      busy.current = false;
    }
  };

  const changeLang = async (l: Lang) => {
    setLang(l);
    await saveLang(l);
    if (pokemon) {
      const loc = await localize(apiKey, pokemon, l);
      setText(loc);
      speakDex(buildSpeech(pokemon, loc, l), l);
    }
  };

  const reset = () => {
    stopSpeaking();
    setPhase('idle');
    setPokemon(null);
    setText(null);
  };

  if (!perm) return <View style={s.root} />;
  if (!perm.granted) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <Text style={s.permText}>{t.permission}</Text>
        <Pressable style={s.bigBtn} onPress={requestPerm}>
          <Text style={s.bigBtnText}>{t.allow}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      {/* Topo estilo Pokédex */}
      <View style={s.top}>
        <View style={s.lensOuter}>
          <View style={s.lensInner} />
        </View>
        <View style={[s.led, { backgroundColor: '#ff5a5a' }]} />
        <View style={[s.led, { backgroundColor: '#ffd23f' }]} />
        <View style={[s.led, { backgroundColor: '#4cd964' }]} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { setDraftKey(apiKey); setShowSettings(true); }} hitSlop={12}>
          <Text style={s.gear}>⚙</Text>
        </Pressable>
      </View>

      {/* Tela / câmera */}
      <View style={s.screenFrame}>
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={s.reticle} pointerEvents="none" />
        {phase === 'idle' && <Text style={s.hint}>{t.scanHint}</Text>}
        {phase === 'scanning' && (
          <View style={s.overlay}>
            <ActivityIndicator size="large" color="#7CFC00" />
            <Text style={s.scanText}>{t.scanning}</Text>
          </View>
        )}
        {phase === 'message' && (
          <View style={s.overlay}>
            <Text style={s.msg}>{message}</Text>
            <Pressable style={s.smallBtn} onPress={reset}>
              <Text style={s.smallBtnText}>OK</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Painel de dados */}
      {phase === 'result' && pokemon && text ? (
        <View style={s.panel}>
          <ScrollView contentContainerStyle={{ padding: 14 }}>
            <View style={s.row}>
              {pokemon.sprite ? <Image source={{ uri: pokemon.sprite }} style={s.sprite} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={s.dexNo}>#{String(pokemon.id).padStart(3, '0')}</Text>
                <Text style={s.name}>{pokemon.name}</Text>
                <Text style={s.genus}>{text.genus}</Text>
                <View style={s.row}>
                  {pokemon.types.map((ty) => (
                    <View key={ty} style={[s.chip, { backgroundColor: TYPE_COLOR[ty] ?? '#888' }]}>
                      <Text style={s.chipText}>{typeLabel(ty, lang)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <Text style={s.desc}>{text.description}</Text>
            <Text style={s.stats}>
              {t.height}: {pokemon.heightM} m   •   {t.weight}: {pokemon.weightKg} kg
            </Text>
            <View style={[s.row, { marginTop: 12 }]}>
              <Pressable
                style={[s.smallBtn, { flex: 1 }]}
                onPress={() => speakDex(buildSpeech(pokemon, text, lang), lang)}
              >
                <Text style={s.smallBtnText}>{t.replay}</Text>
              </Pressable>
              <Pressable style={[s.smallBtn, { flex: 1, backgroundColor: '#2d8cff' }]} onPress={reset}>
                <Text style={s.smallBtnText}>{t.again}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={s.controls}>
          <Pressable
            style={[s.scanBtn, phase === 'scanning' && { opacity: 0.5 }]}
            onPress={scan}
            disabled={phase === 'scanning'}
          >
            <Text style={s.scanBtnText}>{t.scan}</Text>
          </Pressable>
        </View>
      )}

      {/* Configurações */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalBg}
        >
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t.settings}</Text>
            <Text style={s.label}>{t.language}</Text>
            <View style={s.row}>
              {(['pt', 'en'] as Lang[]).map((l) => (
                <Pressable
                  key={l}
                  onPress={() => changeLang(l)}
                  style={[s.langBtn, lang === l && s.langBtnOn]}
                >
                  <Text style={[s.langText, lang === l && { color: '#fff' }]}>
                    {l === 'pt' ? 'Português' : 'English'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>{t.voice}</Text>
            <View style={s.row}>
              {(['robot', 'natural'] as VoiceStyle[]).map((st) => (
                <Pressable key={st} onPress={() => pickStyle(st)} style={[s.langBtn, vStyle === st && s.langBtnOn]}>
                  <Text style={[s.langText, vStyle === st && { color: '#fff' }]}>
                    {st === 'robot' ? t.robot : t.natural}
                  </Text>
                </Pressable>
              ))}
            </View>
            {voices.length === 0 ? (
              <Text style={s.help}>{t.noVoices}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 130, marginTop: 8 }} nestedScrollEnabled>
                <View style={s.row}>
                  {voices.map((v) => (
                    <Pressable
                      key={v.id}
                      onPress={() => pickVoice(v.id)}
                      style={[s.langBtn, voiceId === v.id && s.langBtnOn]}
                    >
                      <Text style={[s.langText, voiceId === v.id && { color: '#fff' }]}>
                        {v.name}{v.enhanced ? ' ★' : ''} ({v.language})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
            <Text style={s.label}>{t.apiKey}</Text>
            <TextInput
              value={draftKey}
              onChangeText={setDraftKey}
              placeholder="AIza..."
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={s.input}
            />
            <Text style={s.help}>{t.apiKeyHelp}</Text>
            <View style={[s.row, { marginTop: 16 }]}>
              <Pressable style={[s.smallBtn, { flex: 1, backgroundColor: '#888' }]} onPress={() => setShowSettings(false)}>
                <Text style={s.smallBtnText}>{t.close}</Text>
              </Pressable>
              <Pressable
                style={[s.smallBtn, { flex: 1 }]}
                onPress={async () => {
                  const k = draftKey.trim();
                  await saveApiKey(k);
                  setApiKey(k);
                  setShowSettings(false);
                  if (phase === 'message') reset();
                }}
              >
                <Text style={s.smallBtnText}>{t.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const RED = '#d62828';
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: RED },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  permText: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  bigBtn: { backgroundColor: '#2d8cff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  bigBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 36 : 8, paddingBottom: 10 },
  lensOuter: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1b1b1b' },
  lensInner: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2d8cff', borderWidth: 2, borderColor: '#0b4fa8' },
  led: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#1b1b1b' },
  gear: { color: '#fff', fontSize: 28 },
  screenFrame: { flex: 1, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 6, borderColor: '#e8e8e8', backgroundColor: '#000' },
  reticle: { position: 'absolute', top: '18%', left: '14%', right: '14%', bottom: '18%', borderWidth: 2, borderColor: 'rgba(124,252,0,0.7)', borderRadius: 12 },
  hint: { position: 'absolute', bottom: 12, alignSelf: 'center', color: '#7CFC00', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 13 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,20,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  scanText: { color: '#7CFC00', marginTop: 10, fontSize: 16, letterSpacing: 1 },
  msg: { color: '#7CFC00', fontSize: 17, textAlign: 'center', marginBottom: 16 },
  controls: { alignItems: 'center', paddingVertical: 18 },
  scanBtn: { backgroundColor: '#2d8cff', width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#0b4fa8', elevation: 6 },
  scanBtnText: { color: '#fff', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  panel: { maxHeight: '48%', backgroundColor: '#9bd67a', marginHorizontal: 16, marginVertical: 12, borderRadius: 14, borderWidth: 4, borderColor: '#1b1b1b' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sprite: { width: 96, height: 96 },
  dexNo: { color: '#1b3a0f', fontWeight: '700' },
  name: { color: '#10260a', fontSize: 26, fontWeight: '900' },
  genus: { color: '#1b3a0f', fontStyle: 'italic', marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  desc: { color: '#10260a', fontSize: 15, lineHeight: 21, marginTop: 10 },
  stats: { color: '#1b3a0f', marginTop: 8, fontWeight: '600' },
  smallBtn: { backgroundColor: '#d62828', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  label: { fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 10, padding: 10, fontSize: 15 },
  help: { color: '#666', fontSize: 12, marginTop: 4 },
  langBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: '#bbb' },
  langBtnOn: { backgroundColor: '#d62828', borderColor: '#d62828' },
  langText: { fontWeight: '700', color: '#333' },
});
