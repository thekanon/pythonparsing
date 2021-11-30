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

    # driver = webdriver.Chrome(chromedriver)
    user_id="thekanon89@gmail.com"
    user_passwd="Kanon16Z@Z"
    login_option="instagram" # facebook or instagram 
    driver_path="~/chromedriver"
    instagram_id_name="username"
    instagram_pw_name="password"
    instagram_login_btn=".sqdOP.L3NKy.y3zKF "
    facebook_login_page_css=".sqdOP.L3NKy.y3zKF "
    facebook_login_page_css2=".sqdOP.yWX7d.y3zKF "
    facebook_id_form_name="email"
    facebook_pw_form_name="pass"
    facebook_login_btn_name="login"

    count = 0
    resCount = 0
    while True:
        login_url = "https://www.fmkorea.com/hiphop" 
        driver.get(login_url) 

        # ## 파일 오픈 후 cafe_woker.txt에 현재 웹사이트에서 파싱한 데이터를 모두 넣는다.
        f = io.open('fmkorea_woker_bak.txt', mode='w', encoding='utf-8')
        fStr =""
        titleArray = driver.find_elements_by_css_selector('.title.hotdeal_var8')
        timeArray =  driver.find_elements_by_css_selector('.time')
        for i in range(len(titleArray)):
            fStr =titleArray[i].text
            fStr += ("\t"+timeArray[i+8].text)
            fStr += "\n"
            f.write(fStr)
        f.close()
        ## 현재 마지막으로 가져온 게시글과 새로가져온 게시글 목록 비교를 위해 cafe_woker.txt를 배열로 가져옴
        f1 = io.open('fmkorea_woker.txt', mode='r', encoding='utf-8')
        f1AllData = f1.readlines()
        f1Equrls = f1AllData[len(f1AllData)-1][:-9]
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

        ## 과도한 트래픽 방지 및 에러를 막기위해 1000분 후 종료
        if(count == 3000) :
            break

        ## 과도한 트래픽 방지를 위해 60초에 한번만 게시글을 가져옴.
        # time.sleep(10)
        time.sleep(random.randint(3,8))


if __name__ == '__main__': 
    try:
        dcweb()
    except :
        time.sleep(20)
        dcweb()