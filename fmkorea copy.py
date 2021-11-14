class Solution:
    def containVirus(self, grid: List[List[int]]) -> int:
        m,n = len(grid),len(grid[0])
        dir_ = {(1,0),(-1,0),(0,1),(0,-1)}
        b = 0
        blank_num = 0
        visited = []
        c = set()
        def get_boundary(x,y,blank):
            nonlocal b,c,visited,cur_visited,blank_num
            cur_visited.add((x,y))
            for dx,dy in dir_:
                if x + dx < 0 or x + dx >= m or y + dy < 0 or y + dy >= n or (x + dx,y + dy) in visited or (x + dx,y + dy) in c:
                    continue
                if grid[x + dx][y + dy] == 0:
                    if (x + dx,y + dy) not in blank:
                        blank.append((x + dx,y + dy))
                        blank_num += 1
                    b += 1
                    continue
                visited.append((x + dx,y + dy))
                get_boundary(x + dx, y + dy,blank)
        
        # 扩散病毒
        def virus_transport(bx,by):
            nonlocal grid,dir_
            ans = set()
            queue = [(bx,by)]
            visited = set()
            visited.add((bx,by))
            while queue:
                len_ = len(queue)
                while len_:
                    x,y = queue.pop(0)
                    for dx,dy in dir_:
                        if x + dx < 0 or x + dx >= m or y + dy < 0 or y + dy >= n or (x + dx,y + dy) in visited or (x + dx,y + dy) in c:
                            continue
                        if grid[x + dx][y + dy] == 0:
                            ans.add((x + dx,y + dy))
                            continue
                        visited.add((x + dx,y + dy))
                        queue.append((x + dx,y + dy))
                    len_ -= 1
            return ans
        
        def all_dead():
            nonlocal grid
            for i in range(m):
                for j in range(n):
                    if grid[i][j] == 0:
                        return False
            return True
            
        ans = 0
        cur_visited = set()
        while True:
            pos = []
            virus_s = []
            canTranblank = []
            cur_visited.clear()
            for i in range(m):
               for j in range(n):
                   b = 0
                   blank_num = 0
                   visited.clear()
                   if grid[i][j] == 1 and (i,j) not in c and (i,j) not in cur_visited:
                       visited.append((i,j))
                       get_boundary(i,j,[])
                       virus_s.append(b)
                       canTranblank.append(blank_num)
                       pos.append(visited[:])
            
            if pos == []:
                return ans       
            
            if all_dead():
                return ans
            
            max_virus = canTranblank.index(max(canTranblank))
            ans += virus_s[max_virus]
            
            for x,y in pos[max_virus]:
                c.add((x,y))
            
            new_areas = []
            for i in range(len(pos)):
                if i == max_virus:
                    continue
                new_areas.extend(list(virus_transport(pos[i][0][0], pos[i][0][1])))

            for x,y in new_areas:
                grid[x][y] = 1
