import time
f = open('house.txt', mode='rt', encoding='utf-8')
while True:
    while True:
        comment = f.readline()
        if comment.find("===") != -1 :
            break
        print(comment)
    print("============")
    time.sleep(5)
