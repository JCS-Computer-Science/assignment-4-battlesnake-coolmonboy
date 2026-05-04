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
                    } else if (snake.id == gameState.you.id) continue;
                    
                    if (cell.x == part.x + 1 && cell.y == part.y || 
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
    let myLength = gameState.you.length;
    let myHead = gameState.you.head;

    let isLongest = gameState.board.snakes.every(snake =>
        snake.id == gameState.you.id || myLength > snake.length
    );

    let closestFood;
    let closestDist = Infinity;

    for (let bit of foods) {
        let dist = Math.abs(myHead.x - bit.x) + Math.abs(myHead.y - bit.y);
        if (dist < closestDist) {
            closestDist = dist;
            closestFood = bit;
        }
    }

    let shouldSeekFood = health <= 50 || !isLongest;

    for (let cell of boardArray) {
        for (let bit of foods) {
            if (cell.x == bit.x && cell.y == bit.y && shouldSeekFood) {
                let dist = Math.abs(myHead.x - bit.x) + Math.abs(myHead.y - bit.y);
                cell.weight *= (10 / (dist + 1));
                if (bit.x == closestFood.x && bit.y == closestFood.y) {
                    cell.weight *= 2;
                }
            }
        }

        if (closestFood && shouldSeekFood) {
            let distToClosestFood = Math.abs(cell.x - closestFood.x) + Math.abs(cell.y - closestFood.y);
            cell.weight *= (10 / (distToClosestFood + 1));
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
                        cell.weight *= 0.1;
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

    function hazardWeight() {
        let danger = gameState.board.hazards;
        let foods = gameState.board.food;
        for (let bit of danger) {
            for (let cell of boardArray) {
                if (cell.x == bit.x && cell.y == bit.y) {
                    for (let food of foods) {
                        if (cell.x == food.x && cell.y == food.y) {
                            cell.weight += 5;
                        } else {
                            cell.weight *= 0.6;
                        }
                    }
                }
            }
        }

    }

    //AI Function for debugging
 function printBoard() {
    const RESET  = '\x1b[0m';
    const BOLD   = '\x1b[1m';


    const RED    = '\x1b[31m';
    const YELLOW = '\x1b[33m';
    const GREEN  = '\x1b[32m';
    const WHITE  = '\x1b[37m';


    const BG_BLACK  = '\x1b[40m';
    const BG_RED    = '\x1b[41m';
    const BG_GREEN  = '\x1b[42m';

    function weightColour(weight) {
        if (weight === -Infinity)       return `${BOLD}${RED}`;
        if (weight >= 2)                return `${BOLD}${BG_GREEN}${WHITE}`;  
        if (weight >= 1)             return `${GREEN}`;                    
        if (weight >= 0.5)             return `${YELLOW}`;                   
        return `${RED}`;                                                       
    }

    let snakeCells = {};
    for (let snake of gameState.board.snakes) {
        for (let i = 0; i < snake.body.length; i++) {
            let part = snake.body[i];
            let isMe   = snake.id === gameState.you.id;
            let isHead = i === 0;
            snakeCells[`${part.x},${part.y}`] = { isMe, isHead };
        }
    }
    let foodCells = new Set(gameState.board.food.map(f => `${f.x},${f.y}`));

    let rows = [];
    for (let y = board.height - 1; y >= 0; y--) {
        let row = [];
        for (let x = 0; x < board.width; x++) {
            let key  = `${x},${y}`;
            let cell = boardArray.find(c => c.x === x && c.y === y);
            let weight = cell ? cell.weight : 0;
            let label;

            if (snakeCells[key]) {
                let { isMe, isHead } = snakeCells[key];
                if (isHead && isMe)       label = `${BOLD}${BG_GREEN}${WHITE} @@ ${RESET}`;
                else if (isHead && !isMe) label = `${BOLD}${BG_RED}${WHITE} @@ ${RESET}`;
                else if (isMe)            label = `${BG_BLACK}${WHITE} SS ${RESET}`;
                else                      label = `${BG_BLACK}${RED}  EE ${RESET}`;
            } else if (weight === -Infinity) {
                label = `${BOLD}${RED} XX ${RESET}`;
            } else {
                let colour = weightColour(weight);
                label = `${colour}${weight.toFixed(2).padStart(5)}${RESET}`;
            }

            row.push(label);
        }
        rows.push(row.join(`${WHITE}|${RESET}`));
    }

    let divider = `${WHITE}${'─'.repeat(7 * board.width)}${RESET}`;
    console.log(divider);
    console.log(rows.join(`\n${divider}\n`));
    console.log(divider);
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
                c.square.weight *= 0.5;
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
            c.totalWeight = c.square.weight + spaceScore;
            c.square.weight = c.totalWeight;
        }

        candidates.sort((a, b) => b.totalWeight - a.totalWeight);
        

        if (candidates[0].totalWeight === -Infinity) {
            candidates.sort((a, b) => b.fill - a.fill);
        }


        
        return {move: candidates[0].dir};


    }
    createBoardArray();
    borderWeight();
    snakeWeight();
    foodWeight();
    enemyWeight();
    hazardWeight();
    console.log("Turn: " + gameState.turn);
    let choice = chooseMove();
    printBoard();
    console.log(choice);
    return choice;

}

