import json,sys
bad=0
for f in sys.argv[1:]:
    for l in open(f):
        r=json.loads(l);b=r['bands']
        flag=[]
        if b['b8k_']>-12 and r['peakHz']>9000: flag.append('WHISTLE')
        if r['peakHz']<60 and b['b20_100']>-6: flag.append('SUBTONE')
        if r['rms']>0.45: flag.append('LOUD')
        if r['limMax']<-8: flag.append('LIM')
        if r['dc']>0.01 or r['dc']<-0.01: flag.append('DC')
        if r['peak']>0.99: flag.append('PEAK>1')
        if r['nan']: flag.append('NAN')
        if r['errs']: flag.append('ERR')
        if r['dead']>60: flag.append('DEAD')
        if flag: bad+=1
        print(f"{r['eng']:8}seed{r['seed']:3} {','.join(flag) or 'ok':22} rms{r['rms']:.2f} pk{r['peak']:.2f} lim{r['limMean']}/{r['limMax']} >8k:{b['b8k_']} 20-100:{b['b20_100']} cent{r['centroid']} peak{r['peakHz']} dead{r['dead']} ducks{r.get('ducks')}")
print('flagged',bad)
