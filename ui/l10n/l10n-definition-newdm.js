const l10nDefinition = [
//    {
//        "selector" : jQuery selector
//        "place"    : text, html or attr
//        "attr"     : only required when place is attr
//        "word"     : word title for i18n.getMessage
//    }

    {
        "selector" : "title",
        "word"     : "windowNewdmTitle"
    },
    {
        "selector" : "label[for=tweetUserSelection]",
        "place"    : "text",
        "word"     : "newdmFrom"
    },
    {
        "selector" : "label[for=recipientScreenname]",
        "place"    : "text",
        "word"     : "newdmTo"
    },
    {
        "selector" : "#tweetButton",
        "place"    : "attr",
        "attr"     : "data-label",
        "word"     : "newdmSend"
    },
    {
        "selector" : "#closeButton",
        "place"    : "text",
        "word"     : "newdmClose"
    },

];
