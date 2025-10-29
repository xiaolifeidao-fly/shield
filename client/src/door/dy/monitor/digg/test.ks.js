(function(){
    var url = "https://www.kuaishou.com/rest/v/photo/like";
    var params = {
        "cancel": 0,
        "exp_tag": "1_a/2005137981900273378_xpcwebunknownxxunknown0",
        "photo_id": "3xsgbat6gwhdqgm",
        "user_id": "3x3kz9xq4t7fktc"
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("accept", "application/json, text/plain, */*");
    xhr.setRequestHeader("Accept-Language", "zh-CN,zh;q=0.9");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(params));
})();