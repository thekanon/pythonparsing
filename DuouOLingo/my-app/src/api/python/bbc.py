## 파싱을 위해 필요한 모듈을 import한다.
import requests #pip install requests 해야 사용 가능하다. 파이썬에서 http 요청을 보내기 위해서 사용한다.
import sys #화면에 표시할때 인코딩을 맞춰주기 위한 모듈이다.
import io #화면에 표시할때 인코딩을 맞춰주기 위한 모듈이다.
from bs4 import BeautifulSoup #pip install bs4 해야 사용 가능하다. 파싱한 데이터를 말 그대로 예쁘게 정리해주는 라이브러리이다.

sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding = 'utf-8') #이부분이 없으면 콘솔에 출력하는것은 잘 되지만 노드로 데이터 전달이 안된다.
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding = 'utf-8') #이부분이 없으면 콘솔에 출력하는것은 잘 되지만 노드로 데이터 전달이 안된다.

# Session 생성
s = requests.Session()

# 헤더 설정
headers = {
    'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36'
}
    
req = s.get('http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',headers=headers)


## HTML 소스 가져오기
html = req.text

# print(html)

## 쉬운 구문분석을 위한 BeautifulSoup 호출
bs = BeautifulSoup ( html , "html.parser" ) # BeautifulSoup 객체 생성
fStr = []
cnt = 0
for item in bs.find_all('item'): #item과 그 내의 자식요소만 필터링
    fStr.append([])
    fStr[cnt].append(item.find_all(["title","description"])[0].get_text()) #item 내의 title과 description만 필터링하여 0번째 데이터의 text만 필터링
    fStr[cnt].append(item.find_all(["title","description"])[1].get_text()) #item 내의 title과 description만 필터링하여 1번째 데이터의 text만 필터링
    cnt+=1


modelData = [{"chkYn":"1","순번":"1", "상태":"R", "증번":"00001", "성명":"kim daim", "주민번호":"930904", "입사일자":"180901", "정년":"75", "평균임금":"5,000,000", "직위":"주임", "한마디":"No great man ever complains of want of opportunity."},
            {"chkYn":"2","순번":"2", "상태":"R", "증번":"00002", "성명":"gyeong da-im", "주민번호":"930904", "입사일자":"180902", "정년":"70", "평균임금":"5,000,0000", "직위":"주임(진)", "한마디":"Do not accustom yourself to use big words for little matters."},
            {"chkYn":"2","순번":"3", "상태":"R", "증번":"00002", "성명":"gyeong da-im", "주민번호":"930904", "입사일자":"180902", "정년":"70", "평균임금":"5,000,0000", "직위":"주임(진)", "한마디":"Do not accustom yourself to use big words for little matters."},
            {"chkYn":"2","순번":"4", "상태":"R", "증번":"00002", "성명":"gyeong da-im", "주민번호":"930904", "입사일자":"180902", "정년":"70", "평균임금":"5,000,0000", "직위":"주임(진)", "한마디":"Do not accustom yourself to use big words for little matters."},
            {"chkYn":"1","순번":"5", "상태":"U", "증번":"00003", "성명":"Lee duim", "주민번호":"940516", "입사일자":"180901", "정년":"70", "평균임금":"5,000,000", "직위":"주임(진)", "한마디":"A day without laughter is a day wasted."},
            {"chkYn":"1","순번":"6", "상태":"R", "증번":"00004"  , "성명":"kim duim", "주민번호":"940516", "입사일자":"180902", "정년":"75", "평균임금":"5,000,0000", "직위":"주임", "한마디":"Patterning your life around other's opinions is nothing more than slavery."}]
print(fStr)