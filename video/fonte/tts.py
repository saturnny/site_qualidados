import json, soundfile as sf, numpy as np, sys
from kokoro_onnx import Kokoro
k = Kokoro("/tmp/claude-0/tts/kokoro.onnx", "/tmp/claude-0/tts/voices.bin")
lines = [
 "Qualidados. Engenharia com tecnologia.",
 "Desde mil novecentos e noventa e três, em Salvador. Genuinamente baiana, nascida no embalo do Polo Petroquímico de Camaçari.",
 "Planejamos, acompanhamos, controlamos e fiscalizamos paradas de manutenção e projetos industriais. Para que a planta volte a operar no prazo, com segurança, e dentro do custo.",
 "São mais de trinta anos de mercado. Mais de dois mil dias sem acidentes com afastamento. E um lugar entre as quinze maiores consultorias de engenharia do Brasil.",
 "Gestão de paradas. Gerenciamento de projetos. Gestão de ativos e confiabilidade. Consultoria em engenharia. E soluções tecnológicas.",
 "Nossas plataformas digitais levam a engenharia para o campo. Fiscal quatro ponto zero, Q D Inspect, Cleópatra Enterprise, Q G I A, e Eng Ágil. Dados em tempo real, que viram decisão.",
 "De Salvador para todo o Brasil, onshore e offshore. Petrobras, Acelen na Refinaria de Mataripe, C B M M, e as maiores operações industriais do país.",
 "Certificada nas normas ISO nove mil e um, quatorze mil e um, e quarenta e cinco mil e um. Great Place to Work. E guiada por uma crença simples: fazer o bem, bem feito.",
 "E agora, com o Grupo G P S, um novo capítulo começa.",
 "Qualidados. Engenharia com tecnologia, para a indústria que não pode parar.",
]
voice = sys.argv[1] if len(sys.argv)>1 else "pf_dora"
out=[]
for i,t in enumerate(lines):
    s, sr = k.create(t, voice=voice, speed=1.0, lang="pt-br")
    sf.write(f"/tmp/claude-0/video/vo_{i}.wav", s, sr)
    out.append(len(s)/sr)
    print(i, round(len(s)/sr,2))
json.dump(out, open("/tmp/claude-0/video/durs.json","w"))
