#!/usr/bin/env python
# -*- coding: utf-8 -*-
import requests
import datetime
import time
import pdb
import os
import io
from io import BytesIO
from bs4 import BeautifulSoup


# Session 생성
s = requests.Session()

gen_req_url = 'http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd'
query_str_parms = {
    'mktId': 'ALL'
    ,'invstTpCd': '9000'
    ,'strtDd': '20210614'
    ,'endDd': '20210621'
    ,'share': '1'
    ,'money': '1'
    ,'csvxls_isNo': 'false'
    ,'name': 'fileDown'
    ,'url': 'dbms/MDC/STAT/standard/MDCSTAT02401'
}
headers = {
    'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36' #generate.cmd에서 찾아서 입력하세요
}

r = requests.get(gen_req_url, query_str_parms, headers=headers)


gen_req_url = 'http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd'
form_data = {
    'code': r.content
}
r = requests.post(gen_req_url, form_data, headers=headers)


# HTTP Post Request: requests대신 r 객체를 사용한다.
## HTML 소스 가져오기
html = r.content
## 쉬운 구문분석을 위한 BeautifulSoup 호출
bs = BeautifulSoup ( html , "html.parser" )

print(bs)