import sys #화면에 표시할때 인코딩을 맞춰주기 위한 모듈이다.
import io #화면에 표시할때 인코딩을 맞춰주기 위한 모듈이다.
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding = 'utf-8') #이부분이 없으면 콘솔에 출력하는것은 잘 되지만 노드로 데이터 전달이 안된다.
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding = 'utf-8') #이부분이 없으면 콘솔에 출력하는것은 잘 되지만 노드로 데이터 전달이 안된다.
modelData = [{"chkYn":"1","flgCd":"1","fileSrno":"1234","contNo":"12345","nmlistDvsn":"test","nmlistRegDt":"2012-01-01","fileNm":"filename","plhodrCnt":"0","adptBaseDt":"2012-01-01","abstr":"test","delYn":"1"}]

print(modelData)