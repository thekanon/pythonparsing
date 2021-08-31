#!/usr/bin/env python
# -*- coding: utf-8 -*-
import requests
import time
import pdb
import io
from bs4 import BeautifulSoup

count = 0
while True:
    count = count + 1
    # Session 생성
    s = requests.Session()

    # 헤더 설정
    headers = {
    }
        
    # HTTP Post Request: requests대신 s 객체를 사용한다.

    # 아래는 게시판 목록이다
    # Lp0T 자유게시판
    # W17m 직장인 게시판
    # USlJ 중계 게시판
    req = s.get('https://m.cafe.daum.net/subdued20club/USlJ',headers=headers)

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

    classToIgnore = ['notice',["cmt_on","notice"]]
    # print(bs)
    # ## 파일 오픈 후 cafe_woker.txt에 현재 웹사이트에서 파싱한 데이터를 모두 넣는다.
    f = io.open('cafe_woker_bak.txt', mode='w', encoding='utf-8')
    for span in bs.find_all('span','article_info'):
        if(span.find(text="공지") or span.find(text="필독")) : 
            continue
        else :
            fStr = span.find(class_="txt_detail").get_text()
            f.write(fStr+"\n")
    f.close()
    ## 현재 마지막으로 가져온 게시글과 새로가져온 게시글 목록 비교를 위해 cafe_woker.txt를 배열로 가져옴
    f1 = io.open('cafe_woker.txt', mode='r', encoding='utf-8')
    f1AllData = f1.readlines()
    f1Equrls = f1AllData[len(f1AllData)-1]
    f1.close()


    ## 새로 가져온 게시글 목록에서 기존 게시글 목록에 추가할 데이터만 추림(마지막으로 가져온 게시글과 비교하여 같을때까지 index를 증가시킴)
    f = io.open('cafe_woker_bak.txt', mode='r', encoding='utf-8')
    allData = f.readlines()
    index = -1
    for line in allData : 
        index = index+1
        if(line.find(f1Equrls) != -1):
            break


    ## 위에서 가져온 인덱스만큼 기존 게시글 목록에 추가함
    f1 = io.open('cafe_woker.txt', mode='a', encoding='utf-8')
    for i in range(index-1, -1,-1):
        print(allData[i])
        f1.write(allData[i])
    print("===")
    f1.close()
    f.close()


    ## 과도한 트래픽 방지 및 에러를 막기위해 1000분 후 종료
    if(count == 10000) :
        break

    # ## 과도한 트래픽 방지를 위해 60초에 한번만 게시글을 가져옴.
    time.sleep(6)
