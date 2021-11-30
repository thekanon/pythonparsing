from selenium import webdriver
from selenium.webdriver.common.by import By 
from selenium.webdriver.support.ui import WebDriverWait 
from selenium.webdriver.support import expected_conditions as EC 
import sys #화면에 표시할때 인코딩을 맞춰주기 위한 모듈이다.
import io #화면에 표시할때 인코딩을 맞춰주기 위한 모듈이다.

import time 
import re 
import json 
import pandas as pd
import requests
import datetime
import time
import pdb
import os
import io
import datetime
import random
from bs4 import BeautifulSoup

def dcweb() :

    sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding = 'utf-8') #이부분이 없으면 콘솔에 출력하는것은 잘 되지만 노드로 데이터 전달이 안된다.
    sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding = 'utf-8') #이부분이 없으면 콘솔에 출력하는것은 잘 되지만 노드로 데이터 전달이 안된다.

    chromedriver = "C:\chromeweb\chromedriver.exe"

    options = webdriver.ChromeOptions()
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    options.add_argument('--user-data-dir=C:\chromeweb')
    driver = webdriver.Chrome(chromedriver,options=options)

    count = 0
    resCount = 732597
    gallName = "m_entertainer_new1"
    while True:
        # 검색할 주소의 시작점을 넣는다.
        login_url = "https://gall.dcinside.com/board/lists/?id="+gallName+"&page=1&search_pos=-"+str(resCount)+"&s_type=search_subject&s_keyword=%EC%B0%90%ED%8A%B9" 
        resCount-=10000
        driver.get(login_url)

        f = io.open('dcsearch.txt', mode='a', encoding='utf-8')
        fStr =""
        titleArray = driver.find_elements_by_css_selector(".gall_tit.ub-word")
        for i in range(len(titleArray)):
            fStr =titleArray[i].text
            fStr += "\n"
            f.write(fStr)
        f.close()

        ## 과도한 트래픽 방지 및 에러를 막기위해 1000분 후 종료
        if(count == 3000) :
            break

        ## 과도한 트래픽 방지를 위해 60초에 한번만 게시글을 가져옴.
        time.sleep(2)


if __name__ == '__main__': 
    try:
        dcweb()
    except :
        time.sleep(20)
        dcweb()