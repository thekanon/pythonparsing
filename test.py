import io
## 현재 마지막으로 가져온 게시글과 새로가져온 게시글 목록 비교를 위해 cafe_woker.txt를 배열로 가져옴
f1 = io.open('fmkorea_woker.txt', mode='r', encoding='utf-8')
f1AllData = f1.readlines()
f1Equrls = f1AllData[len(f1AllData)-1][:-10]
f1.close()


## 새로 가져온 게시글 목록에서 기존 게시글 목록에 추가할 데이터만 추림(마지막으로 가져온 게시글과 비교하여 같을때까지 index를 증가시킴)
f = io.open('fmkorea_woker_bak.txt', mode='r', encoding='utf-8')
allData = f.readlines()
index = -1
for line in allData : 
    index = index+1
    if(line.find(f1Equrls) != -1):
        break

## 위에서 가져온 인덱스만큼 기존 게시글 목록에 추가함
d = datetime.datetime.today()
dStr = d.strftime("%m/%d %H:%M:%S")
f1 = io.open('fmkorea_woker.txt', mode='a', encoding='utf-8')
writeFlag = False

for i in range(index-1, -1,-1):
    if(i==index-1) :
        f1.write("==="+dStr+"===\n")
    print(allData[i])
    f1.write(allData[i])

f1.close()
f.close()
print("==="+dStr+"===\n")
