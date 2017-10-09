const l10nDefinition = [
//    {
//        "selector" : jQuery selector
//        "place"    : text, html or attr
//        "attr"     : only required when place is attr
//        "word"     : word title for i18n.getMessage
//    }

    {
        "selector" : "title",
        "word"     : "window.api.title"
    },
    {
        "selector" : "#apiHead > th:eq(0)",
        "place"    : "text",
        "word"     : "api.api"
    },
    {
        "selector" : "#apiHead > th:eq(1)",
        "place"    : "text",
        "word"     : "api.remaining"
    },
    {
        "selector" : "#apiHead > th:eq(2)",
        "place"    : "text",
        "word"     : "api.limit"
    },
    {
        "selector" : "#apiHead > th:eq(3)",
        "place"    : "text",
        "word"     : "api.reset_time"
    },
    {
        "selector" : "#closeButton",
        "place"    : "text",
        "word"     : "api.close"
    },

];
