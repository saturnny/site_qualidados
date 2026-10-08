import numpy as np, json, soundfile as sf
SR=48000; TL=json.load(open("timeline.json")); T=TL[-1]["end"]+0.3; n=int(T*SR)
t=np.arange(n)/SR; rng=np.random.default_rng(7)
def note(m): return 440*2**((m-69)/12)
def lp(x,a):  # one-pole lowpass, a in (0,1)
    from scipy.signal import lfilter
    return lfilter([a],[1,-(1-a)],x)
BPM=96; beat=60/BPM; bar=4*beat
chords=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]  # Am F C G
bass=[45,41,48,43]
mus=np.zeros((n,2))
# pad
for ci in range(int(T/(2*bar))+2):
    c=chords[ci%4]; s0=ci*2*bar; s1=s0+2*bar
    i0=int(s0*SR); i1=min(n,int((s1+0.6)*SR))
    if i0>=n: break
    tt=t[i0:i1]-s0; L=s1+0.6-s0
    env=np.minimum(1,tt/0.8)*np.minimum(1,np.maximum(0,(L-tt)/1.0))
    for k,m in enumerate(c):
        for det,pan in ((-0.08,0.2),(0.08,0.8)):
            f=note(m)*(1+det/100*7)
            w=2*((f*tt+rng.random())%1)-1
            sig=w*env*0.022
            mus[i0:i1,0]+=sig*(1-pan); mus[i0:i1,1]+=sig*pan
mus[:,0]=lp(mus[:,0],0.06); mus[:,1]=lp(mus[:,1],0.06)
# sub bass (from scene 1)
st1=TL[1]["start"]; endb=TL[-1]["start"]+1.5
b=np.zeros(n)
for ci in range(int(T/(2*bar))+2):
    for h in range(8):  # eighth-ish pulses per 2 bars -> each beat
        s=ci*2*bar+h*beat
        if s<st1 or s>endb: continue
        i0=int(s*SR); i1=min(n,i0+int(beat*SR))
        tt=t[i0:i1]-s; f=note(bass[ci%4]-12)
        b[i0:i1]+=np.sin(2*np.pi*f*tt)*np.exp(-tt*3.5)*0.22
# kick on each beat from scene 1, hats off-beat from scene 2
kick=np.zeros(n); hat=np.zeros(n); arp=np.zeros(n)
nb=int(T/beat)+1
for j in range(nb):
    s=j*beat
    if st1<=s<=endb:
        i0=int(s*SR); i1=min(n,i0+int(0.35*SR)); tt=t[i0:i1]-s
        kick[i0:i1]+=np.sin(2*np.pi*(45*tt+ (110/18)*(1-np.exp(-tt*18))))*np.exp(-tt*9)*0.32
    if TL[2]["start"]<=s<=TL[-1]["start"]:
        s2=s+beat/2; i0=int(s2*SR); i1=min(n,i0+int(0.06*SR))
        hat[i0:i1]+=rng.standard_normal(i1-i0)*np.exp(-(t[i0:i1]-s2)*70)*0.05
# arpeggio sixteenths-ish (eighths) from scene 3 to scene 8
for j in range(int(T/(beat/2))):
    s=j*beat/2
    if not (TL[3]["start"]<=s<=TL[8]["end"]): continue
    ci=int(s//(2*bar)); c=chords[ci%4]; m=c[[0,2,1,3,2,1,3,2][j%8]]+12
    i0=int(s*SR); i1=min(n,i0+int(0.5*SR)); tt=t[i0:i1]-s; f=note(m)
    arp[i0:i1]+=(np.sin(2*np.pi*f*tt)+0.3*np.sin(4*np.pi*f*tt))*np.exp(-tt*7)*0.045
from scipy.signal import lfilter
hat=hat-lfilter([0.3],[1,-0.7],hat)
# delay on arp
d=int(beat*0.75*SR); arpL=arp.copy(); arpR=arp.copy()
arpR[d:]+=arp[:-d]*0.45; arpL[2*d:]+=arp[:-2*d]*0.25
# transitions: whoosh + boom
fx=np.zeros(n)
for x in TL[1:]:
    bnd=x["start"]
    i0=int((bnd-0.7)*SR); i1=int((bnd+0.15)*SR); tt=(t[i0:i1]-(bnd-0.7))/0.85
    nz=rng.standard_normal(i1-i0); a=0.02+0.25*tt**2
    w=lfilter([1],[1,-0.0],nz); w=np.array(w)
    # sweeping lowpass via varying smoothing: blockwise
    out=np.zeros_like(w); y=0
    for k in range(len(w)):
        al=0.02+0.5*tt[k]**2; y+=al*(w[k]-y); out[k]=y
    fx[i0:i1]+=out*np.sin(np.pi*np.clip(tt,0,1))**1.5*0.5
    j0=int(bnd*SR); j1=min(n,j0+int(1.2*SR)); tt=t[j0:j1]-bnd
    fx[j0:j1]+=np.sin(2*np.pi*(38*tt+30*(1-np.exp(-tt*10))/10))*np.exp(-tt*3.2)*0.35
# intro shimmer riser and outro hit
i1=int(1.7*SR); tt=t[:i1]
fx[:i1]+=np.sin(2*np.pi*note(81)*tt)*0.03*(tt/1.7)**2
# VO track
vo=np.zeros(n)
for i,x in enumerate(TL):
    s,sr=sf.read(f"vo_{i}.wav"); 
    if s.ndim>1: s=s.mean(1)
    rs=np.interp(np.arange(int(len(s)*SR/sr))/SR*sr, np.arange(len(s)), s)
    i0=int(x["vo"]*SR); vo[i0:i0+len(rs)]+=rs[:max(0,min(len(rs),n-i0))]
vo=vo/np.max(np.abs(vo))*0.85
# ducking envelope
env=np.abs(vo); env=lfilter([0.0008],[1,-0.9992],env); env=env/env.max()
duck=1-0.45*np.clip(env*3,0,1)
music=mus+np.stack([b+kick+hat+fx,b+kick+hat+fx],1)+np.stack([arpL,arpR],1)
# master fades
fade=np.clip(t/1.2,0,1)*np.clip((T-0.3-t)/3.0,0,1)
music*= (duck*fade)[:,None]
music=music/np.max(np.abs(music))*0.55
mix=music+np.stack([vo,vo],1)
mix=np.tanh(mix*1.1)/np.tanh(1.1)
sf.write("mix.wav",mix.astype(np.float32),SR)
print("ok",T)
