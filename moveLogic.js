export default function move(gameState) {
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };

    let board = gameState.board;
    let boardArray = [];

    function createBoardArray() {
        for (let x = 0; x < board.width; x++) {
            for (let y = 0; y < board.height; y++){
                boardArray.push({x:x, y:y, weight:1})
            }
        }
    }

    function borderWeight() {
        for (let part of boardArray) {
            if (part.x == 0 || part.x == board.width - 1 || part.y == 0 || part.y == board.height - 1) {
                part.weight *= 0.75;
            }
        }
    }

    function snakeWeight() {
    let allSnakes = gameState.board.snakes;
        for (let snake of allSnakes) {
            let body = snake.body;
            for (let i = 0; i < body.length; i++) {
                let part = body[i];
                let isTail = i == body.length - 1;  
                for (let cell of boardArray) {
                    if (cell.x == part.x && cell.y == part.y) {
                        if (!isTail) cell.weight = -Infinity;  
                    } else if (cell.x == part.x + 1 && cell.y == part.y || 
                    cell.x == part.x - 1 && cell.y == part.y ||
                    cell.x == part.x && cell.y == part.y + 1 ||
                    cell.x == part.x && cell.y == part.y - 1
                    ){
                        cell.weight *= 0.75;
                    } 
                }
            }
        }
    }

    function foodWeight() {
        let foods = gameState.board.food;
        let health = gameState.you.health;
        for (let bit of foods) {
            for (let cell of boardArray) {
                if (cell.x == bit.x && cell.y == bit.y) {
                    if (health <= 75) {
                        cell.weight *= 2;
                    } else {
                        cell.weight *= 0.75;
                    }
                }
            }
        }
    }

    function enemyWeight() {
        let allSnakes = gameState.board.snakes;
        let myLength = gameState.you.length;
        for (let snake of allSnakes) {
            if (snake.id == gameState.you.id) continue;
            let enemyHead = snake.body[0];
            let enemyLength = snake.length;
            for (let cell of boardArray) {
                let dist = Math.abs(cell.x - enemyHead.x) + Math.abs(cell.y - enemyHead.y);
                if (dist == 1) {
                    if (myLength >= enemyLength + 1) {
                        cell.weight *= 1.5;
                    } else {
                        cell.weight *= 0.5;
                    }
                }
            }
        }
    }

    function floodFill(startX, startY, tempBlock = null) {
        let visited = new Set();
        let queue = [{x: startX, y: startY}];

        while (queue.length > 0) {
            let {x, y} = queue.shift();
            let key = `${x},${y}`;
            if (visited.has(key)) continue;
            if (tempBlock && x == tempBlock.x && y == tempBlock.y) continue;

            let cell = boardArray.find(c => c.x == x && c.y == y);
            if (!cell || cell.weight == -Infinity) continue;

            visited.add(key);
            for (let n of [{x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1}]) {
                if (!visited.has(`${n.x},${n.y}`)) queue.push(n);
            }
        }
        return visited.size;
    }

    function getEnemyArea(tempBlock) {
        let area = 0;
        for (let snake of gameState.board.snakes) {
            if (snake.id == gameState.you.id) continue;
            let h = snake.body[0];
            area += floodFill(h.x, h.y, tempBlock);
        }
        return area;
    }

    function chooseMove() {
        let myHead = gameState.you.body[0];
        let myNeck = gameState.you.body[1];
        if (myNeck.x < myHead.x) moveSafety.left = false;
        if (myNeck.x > myHead.x) moveSafety.right = false;
        if (myNeck.y < myHead.y) moveSafety.down = false;
        if (myNeck.y > myHead.y) moveSafety.up = false;

        let candidates = [
            {dir: "right", square: boardArray.find(c => c.x == myHead.x + 1 && c.y == myHead.y) ?? {weight: -Infinity}},
            {dir: "left", square: boardArray.find(c => c.x == myHead.x - 1 && c.y == myHead.y) ?? {weight: -Infinity}},
            {dir: "up", square: boardArray.find(c => c.x == myHead.x && c.y == myHead.y + 1) ?? {weight: -Infinity}},
            {dir: "down", square: boardArray.find(c => c.x == myHead.x && c.y == myHead.y - 1) ?? {weight: -Infinity}},
        ];

        candidates = candidates.filter(c => moveSafety[c.dir]);
        let myLength = gameState.you.length;

        let maxFill = 1;
        for (let c of candidates) {
            c.fill = c.square.weight > -Infinity ? floodFill(c.square.x, c.square.y) : 0;
            maxFill = Math.max(maxFill, c.fill);
        }

        for (let c of candidates) {
            if (c.fill > 0 && c.fill < myLength) {
                c.square.weight = -Infinity;
                c.fill = 0;
            }
        }
        
        let baseEnemyArea = getEnemyArea(null);
        let maxTrapReduction = 1; 
        for (let c of candidates) {
            if (c.square.weight == -Infinity) {c.trapReduction = 0; continue;}
            let enemyAreaAfter = getEnemyArea({x: c.square.x, y: c.square.y});
            c.trapReduction = baseEnemyArea - enemyAreaAfter; 
            maxTrapReduction = Math.max(maxTrapReduction, c.trapReduction);
        }

        for (let c of candidates) {
            let spaceScore = (c.fill / maxFill) * 2;
            let trapScore = (c.trapReduction / maxTrapReduction) * 1.5;
            c.totalWeight = c.square.weight + spaceScore + trapScore;
        }

        candidates.sort((a, b) => b.totalWeight - a.totalWeight);

        console.log("Turn: " + gameState.turn);
        console.log(candidates);
        return {move: candidates[0].dir};


    }
    createBoardArray();
    borderWeight();
    snakeWeight();
    foodWeight();
    enemyWeight();
    return chooseMove();
}

