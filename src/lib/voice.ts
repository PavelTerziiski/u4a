export const getBulgarianVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices()
  
  // Приоритет на гласове
  const preferred = [
    'daria',
    'google български',
    'bulgarian',
    'bg-bg',
  ]
  
  for (const name of preferred) {
    const voice = voices.find(v => 
      v.name.toLowerCase().includes(name) || 
      v.lang.toLowerCase().includes('bg')
    )
    if (voice) return voice
  }
  
  return null
}
