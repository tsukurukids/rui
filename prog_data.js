// ============================================================
// prog_data.js  ─  プログラミング学習「ミッション」データ
// ============================================================

const PROG_COURSES = {
    beginner: {
        title: "【初級】ねこを動かそう！",
        missions: [
            {
                text: "「10歩動かす」ブロックをみつけて、真ん中に置いてね。",
                pos: "left" // Points to blocks palette
            },
            {
                text: "ブロックをクリックして、ねこが動くか見てみよう！",
                pos: "center"
            },
            {
                text: "「ずっと」ブロックで、ねこを走り続けさせてみよう！",
                pos: "left"
            }
        ]
    },
    intermediate: {
        title: "【中級】図形を描こう！",
        missions: [
            {
                text: "「ペン」の機能を追加して、線が引けるようにしよう。",
                pos: "bottom-left"
            },
            {
                text: "「4回繰り返す」を使って、正方形を描いてみてね。",
                pos: "left"
            },
            {
                text: "色を変えながら描いて、カラフルな四角にしよう！",
                pos: "left"
            }
        ]
    },
    advanced: {
        title: "【上級】かんたんなゲーム作り",
        missions: [
            {
                text: "マウスについてくるように、ねこをプログラミングしよう。",
                pos: "left"
            },
            {
                text: "別のキャラクター（敵）を動かして、当たったら止まるようにしよう。",
                pos: "left"
            },
            {
                text: "変数を使って「スコア」を数えるようにしてみよう！",
                pos: "right" // Points to variables
            }
        ]
    }
};
