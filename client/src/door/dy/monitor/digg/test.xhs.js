(function(){
    var url = "https://edith.xiaohongshu.com/api/sns/web/v1/note/like";
    var params = {
        "note_oid": "68f758f50000000007039ef9",
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("accept", "application/json, text/plain, */*");
    xhr.setRequestHeader("Accept-Language", "zh-CN,zh;q=0.9");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(params));
})();
C.post("/api/sns/web/v1/note/like", {
    "note_oid": "68f3a9f10000000004011955",
}, {})
(function(){
    window.__x24grereer2x212__.post("/api/sns/web/v1/note/like", {
    "note_oid": "68f3a9f10000000004011955",
    }, {})
})();

(function(){
    window.__x24grereer2x212__.get("/api/sns/web/v1/get_liked_num", {
    "note_oid": "68f3a9f10000000004011955",
    })
})();
