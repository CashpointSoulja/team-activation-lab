import json,re,subprocess,os
S={x['id']:x for x in json.load(open('script.json'))}
T=json.load(open('timeline.json')); fr=T['frames']; end=T['end']
with open('frames.txt','w') as f:
    for i,t in enumerate(fr):
        d=(fr[i+1] if i+1<len(fr) else end)-t
        f.write(f"file 'frames/{i:06d}.jpg'\nduration {max(d,0.001):.4f}\n")
    f.write(f"file 'frames/{len(fr)-1:06d}.jpg'\n")
def ts(t,ass=False):
    h=int(t//3600);m=int(t%3600//60);s=t%60
    return f"{h}:{m:02d}:{s:05.2f}" if ass else f"{h:02d}:{m:02d}:{s:06.3f}".replace('.',',')
cues=[]
for x in T['times']:
    s=S[x['id']]; parts=[p.strip() for p in re.split(r'(?<=[.?])\s+',s['text']) if p.strip()]
    # merge very short parts
    m=[]
    for p in parts:
        if m and len(m[-1])<45: m[-1]+=' '+p
        else: m.append(p)
    tot=sum(len(p) for p in m); t=x['start']+0.1
    for p in m:
        d=s['dur']*len(p)/tot; cues.append((t,t+d,p)); t+=d
with open('walkthrough.srt','w') as f:
    for i,(a,b,p) in enumerate(cues,1): f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{p}\n\n")
hdr="""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Source Sans 3,54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H28141C15,1,0,0,0,100,100,0,0,3,18,0,2,70,70,150,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open('walkthrough.ass','w') as f:
    f.write(hdr)
    for a,b,p in cues: f.write(f"Dialogue: 0,{ts(a,True)},{ts(b,True)},Default,,0,0,0,,{p}\n")
ins=[];flt=[]
for i,x in enumerate(T['times']):
    ins+=['-i',f"vo/{x['id']}.wav"]; d=int(x['start']*1000+100); flt.append(f"[{i+1}:a]adelay={d}|{d}[a{i}]")
n=len(T['times'])
flt.append(''.join(f"[a{i}]" for i in range(n))+f"amix=inputs={n}:normalize=0,apad,atrim=0:{end:.2f},aresample=48000[aout]")
fonts='fonts'
flt.append(f"[0:v]fps=30,scale=1080:1920:flags=lanczos,setsar=1,ass=walkthrough.ass:fontsdir={fonts},format=yuv420p[vout]")
cmd=['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i','frames.txt']+ins+['-filter_complex',';'.join(flt),'-map','[vout]','-map','[aout]','-c:v','libx264','-preset','slow','-crf','24','-c:a','aac','-b:a','160k','-movflags','+faststart','-t',f"{end:.2f}",'walkthrough.mp4']
subprocess.run(cmd,check=True)
with open('VOICEOVER.md','w') as f:
    f.write("# Walkthrough voiceover script\n\nVertical 1080×1920 live UI walkthrough of the local build (synthetic data only). Timecodes match `team-activation-lab-walkthrough.mp4` and `team-activation-lab-walkthrough.srt`.\n\n| Start | Line |\n|---|---|\n")
    for x in T['times']:
        t=x['start']; f.write(f"| {int(t//60)}:{t%60:04.1f} | {S[x['id']]['text']} |\n")
print('cues',len(cues),'end',round(end,2))
