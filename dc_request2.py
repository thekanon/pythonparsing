## parser.py
import requests
import time
import pdb
from bs4 import BeautifulSoup


count = 0
while True:
    count = count + 1
    # Session 생성
    s = requests.Session()

    # 헤더 설정
    headers = {
        'User-Agent' : 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Mobile Safari/537.36'
    }
        
    # HTTP Post Request: requests대신 s 객체를 사용한다.
    
    # 아래는 갤러리 목록이다.
    # leagueoflegends3
    # jusik
    # baseball_new9
    # aoegame
    # hiphop
    req = s.post('https://m.dcinside.com/board/baseball_new9',headers=headers)

    ## HTML 소스 가져오기
    html = req.text
    ## HTTP Header 가져오기
    header = req.headers
    ## HTTP Status 가져오기 (200: 정상)
    status = req.status_code
    ## HTTP가 정상적으로 되었는지 (True/False)
    is_ok = req.ok

    ## 쉬운 구문분석을 위한 BeautifulSoup 호출
    bs = BeautifulSoup ( html , "html.parser" )

    ## 파일 오픈 후 test.txt에 현재 웹사이트에서 파싱한 데이터를 모두 넣는다.
    f = open('testt.txt', mode='w', encoding='utf-8')

    for link in bs.find_all(['span','ul'], ['detail-txt','ginfo']):
        if(link.name=="span") :
            # f.write(link.get_text()+" "*4)
            fStr = link.get_text()+" "*4
        else :
            fStr += link.get_text()
            fStr = fStr[0:fStr.find("조회")]
            fStr += "\n"
            f.write(fStr)        
    f.close()

    ## 현재 마지막으로 가져온 게시글과 새로가져온 게시글 목록 비교를 위해 test1.txt를 배열로 가져옴
    f1 = open('testt1.txt', mode='r', encoding='utf-8')
    f1AllData = f1.readlines()
    f1Equrls = f1AllData[len(f1AllData)-1]
    f1.close()


    ## 새로 가져온 게시글 목록에서 기존 게시글 목록에 추가할 데이터만 추림(마지막으로 가져온 게시글과 비교하여 같을때까지 index를 증가시킴)
    f = open('testt.txt', mode='r', encoding='utf-8')
    allData = f.readlines()
    index = -1
    for line in allData : 
        index = index+1
        if(line.find(f1Equrls) != -1):
            break


    ## 위에서 가져온 인덱스만큼 기존 게시글 목록에 추가함
    f1 = open('testt1.txt', mode='a', encoding='utf-8')
    for i in range(index-1, -1,-1):
        print(allData[i])
        f1.write(allData[i])
    f1.close()
    f.close()

    print("---\n")

    ## 과도한 트래픽 방지 및 에러를 막기위해 1000분 후 종료
    if(count == 3000) :
        break

    ## 과도한 트래픽 방지를 위해 60초에 한번만 게시글을 가져옴.
    time.sleep(10)
