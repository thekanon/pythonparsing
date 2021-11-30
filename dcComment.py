import time
import datetime
f = open('house2.txt', mode='rt', encoding='utf-8')
while True:
    comment=""
    i=0
    currentLine = '===11/20 00:48:56==='
    hours = 10
    min = int(currentLine.split(":")[1])
    sec = int(currentLine.split(":")[2][:2])
    time1 = datetime.timedelta(hours=hours,minutes=min,seconds=sec)
    while True:
        currentLine = f.readline()
        if currentLine.find("===") != -1 :
            hours = 10
            min = int(currentLine.split(":")[1])
            sec = int(currentLine.split(":")[2][:2])
            time2 = datetime.timedelta(hours=hours,minutes=min,seconds=sec)
            # print(time2,time1)
            print(comment)
            
            time.sleep(time2.seconds-time1.seconds)
            comment=""
            time1 = time2
        else:
            comment += currentLine
        