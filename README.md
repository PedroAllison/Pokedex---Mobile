# Pokédex Câmera

Aponte a câmera do celular para um Pokémon (carta, boneco, pelúcia, tela) e a Pokédex fala quem ele é, o tipo e a descrição. Dados da [PokeAPI](https://pokeapi.co/); reconhecimento por imagem com o Google Gemini (plano gratuito). Português e inglês.

## Instalar no celular (Android)

1. Abra a página **[Releases](../../releases/tag/apk-latest)** deste repositório pelo celular.
2. Baixe o arquivo **`pokedex-camera.apk`**.
3. Abra o arquivo baixado e permita "instalar apps desconhecidos" quando o Android pedir.
4. Abra o app, permita a câmera, toque no **⚙** e cole sua chave grátis do Gemini
   (crie em <https://aistudio.google.com/apikey>, sem cartão). A chave fica só no seu aparelho.
5. Escolha o idioma e a voz no ⚙ e toque em **ESCANEAR**.

> O APK é gerado automaticamente pelo GitHub Actions a cada push na branch `main`
> (aba **Actions**). O primeiro build leva uns 10–20 minutos.

## Rodar em desenvolvimento

```bash
npm install
npx expo start      # abra com o app Expo Go
```

## Estrutura

- `App.tsx` – interface (câmera, painel, configurações)
- `src/ai.ts` – reconhecimento (Gemini) e tradução pt-BR
- `src/pokeapi.ts` – dados da PokeAPI
- `src/voice.ts` – voz da Pokédex (TTS do aparelho)
- `.github/workflows/build-apk.yml` – build automático do APK
- `download.html` – página simples de download (opcional)

## Limites

O plano gratuito do Gemini tem limite de requisições por minuto/dia e o Google pode usar as imagens enviadas para melhorar seus produtos. Cada pessoa deve usar a própria chave; não coloque a sua dentro do app.
