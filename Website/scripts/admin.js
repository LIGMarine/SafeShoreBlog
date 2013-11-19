﻿/* Helper method */

function ConvertMarkupToValidXhtml(markup) {
    var docImplementation = document.implementation;
    var htmlDocument = docImplementation.createHTMLDocument("temp");
    var xHtmlDocument = docImplementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
    var xhtmlBody = xHtmlDocument.createElementNS('http://www.w3.org/1999/xhtml', 'body');

    htmlDocument.body.innerHTML = "<div>" + markup + "</div>";

    xHtmlDocument.documentElement.appendChild(xhtmlBody);
    xHtmlDocument.importNode(htmlDocument.body, true);
    xhtmlBody.appendChild(htmlDocument.body.firstChild);

    /<body.*?><div>(.*?)<\/div><\/body>/im.exec(xHtmlDocument.documentElement.innerHTML);
    return RegExp.$1;
}

/* End of Helper method */

(function ($) {

    var postId, isNew,
        txtTitle, txtContent, txtMessage, txtImage, chkPublish,
        btnNew, btnEdit, btnDelete, btnSave, btnCancel,

    editPost = function () {
        txtTitle.attr('contentEditable', true);
        txtContent.wysiwyg({ hotKeys: {}, activeToolbarClass: "active" });
        txtContent.css({ minHeight: "400px" });
        txtContent.focus();

        btnNew.attr("disabled", true);
        btnEdit.attr("disabled", true);
        btnSave.removeAttr("disabled");
        btnCancel.removeAttr("disabled");
        chkPublish.removeAttr("disabled");

        showCategoriesForEditing();

        toggleSourceView();

        $("#tools").fadeIn().css("display", "inline-block");
    },
    cancelEdit = function () {
        if (isNew) {
            if (confirm("Do you want to leave this page?"))
                history.back();
        }
        else {
            txtTitle.removeAttr('contentEditable');
            txtContent.removeAttr('contentEditable');
            btnCancel.focus();

            btnNew.removeAttr("disabled");
            btnEdit.removeAttr("disabled");
            btnSave.attr("disabled", true);
            btnCancel.attr("disabled", true);
            chkPublish.attr("disabled", true);

            showCategoriesForDisplay();

            $("#tools").fadeOut();
        }
    },
    toggleSourceView = function () {
        $(".source").bind("click", function () {
            var self = $(this);
            if (self.attr("data-cmd") === "source") {
                self.attr("data-cmd", "design");
                self.addClass("active");
                txtContent.text(txtContent.html());
            }
            else {
                self.attr("data-cmd", "source");
                self.removeClass("active");
                txtContent.html(txtContent.text());
            }
        });
    },
    savePost = function (e) {
        if ($(".source").attr("data-cmd") === "design") {
            $(".source").click();
        }

        txtContent.cleanHtml();

        var parsedDOM;

        /*  IE9 doesn't support text/html MimeType https://github.com/madskristensen/MiniBlog/issues/35
        
            parsedDOM = new DOMParser().parseFromString(txtContent.html(), 'text/html');
            parsedDOM = new XMLSerializer().serializeToString(parsedDOM);

            /<body>(.*)<\/body>/im.exec(parsedDOM);
            parsedDOM = RegExp.$1;
        
        */

        /* When its time to drop IE9 support toggle commented region with 
           the following statement and ConvertMarkupToXhtml function */
        parsedDOM = ConvertMarkupToValidXhtml(txtContent.html());

        $.post("/post.ashx?mode=save", {
            id: postId,
            isPublished: chkPublish[0].checked,
            title: txtTitle.text().trim(),
            content: parsedDOM,
            categories: getPostCategories(),
        })
          .success(function (data) {
              if (isNew) {
                  location.href = data;
                  return;
              }

              showMessage(true, "The post was saved successfully");
              cancelEdit(e);
          })
          .fail(function (data) {
              if (data.status === 409)
                  showMessage(false, "The title is already in use");
              else
                  showMessage(false, "Something bad happened. Server reported " + data.status + " " + data.statusText);
          });
    },
    deletePost = function () {
        if (confirm("Are you sure you want to delete this post?")) {
            $.post("/post.ashx?mode=delete", { id: postId })
                .success(function () { location.href = "/"; })
                .fail(function () { showMessage(false, "Something went wrong. Please try again"); });
        }
    },
    showMessage = function (success, message) {
        var className = success ? "alert-success" : "alert-error";
        txtMessage.addClass(className);
        txtMessage.text(message);
        txtMessage.parent().fadeIn();

        setTimeout(function () {
            txtMessage.parent().fadeOut("slow", function () {
                txtMessage.removeClass(className);
            });
        }, 4000);
    },
    getPostCategories = function () {
        var categories = '';
        if ($("#txtCategories").length > 0) {
            categories = $("#txtCategories").val();
        }
        else {
            $("ul.categories li a").each(function (index, item) {
                if (categories.length > 0) {
                    categories += ",";
                }
                categories += $(item).html();
            });
        }
        return categories;
    },
    showCategoriesForEditing = function () {
        var firstItemPassed = false;
        var categoriesString = getPostCategories();
        $("ul.categories li").each(function (index, item) {
            if (!firstItemPassed) {
                firstItemPassed = true;
            }
            else {
                $(item).remove();
            }
        });
        $("ul.categories").append("<li><input id='txtCategories' class='form-control' /></li>");
        $("#txtCategories").val(categoriesString);
    },
    showCategoriesForDisplay = function () {
        if ($("#txtCategories").length > 0) {
            var categoriesArray = $("#txtCategories").val().split(',');
            $("#txtCategories").parent().remove();

            $.each(categoriesArray, function (index, category) {
                $("ul.categories").append(' <li itemprop="articleSection" title="' + category + '"> <a href="/category/' + encodeURIComponent(category.toLowerCase()) + '">' + category + '</a> </li> ');
            });
        }
    };

    isNew = location.pathname.replace(/\//g, "") === "postnew";

    postId = $("[itemprop~='blogPost']").attr("data-id");

    txtTitle = $("[itemprop~='blogPost'] [itemprop~='name']");
    txtContent = $("[itemprop~='articleBody']");
    txtMessage = $("#admin .alert");
    txtImage = $("#admin #txtImage");

    btnNew = $("#btnNew");
    btnEdit = $("#btnEdit").bind("click", editPost);
    btnDelete = $("#btnDelete").bind("click", deletePost);
    btnSave = $("#btnSave").bind("click", savePost);
    btnCancel = $("#btnCancel").bind("click", cancelEdit);
    chkPublish = $("#ispublished").find("input[type=checkbox]");

    $(document).keyup(function (e) {
        if (e.keyCode === 46) // Delete key
            deletePost();
        else if (e.keyCode === 27) // ESC key
            cancelEdit();
    });

    $('.uploadimage').click(function (e) {
        e.preventDefault();
        $('#txtImage').click();
    });

    if (isNew) {
        editPost();
        $("#ispublished").fadeIn();
        chkPublish[0].checked = true;
    }
    else if (txtTitle !== null && txtTitle.length === 1 && location.pathname.length > 1) {
        btnEdit.removeAttr("disabled");
        btnDelete.removeAttr("disabled");
        $("#ispublished").css({ "display": "inline" });
    }

})(jQuery);