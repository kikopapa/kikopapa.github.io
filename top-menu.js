$(document).ready(() => {
  $('#TOP-MENU').click(function(){
    //避免 a 標籤會觸發
    event.preventDefault();
    //展開或收起來
    $('.main-nav').slideToggle(600);
    
  })
  // $('.main-nav li a').click(function(){
  //   event.preventDefault();
  //   //收起來
  //   $('.main-nav').slideUp(600);
  //   //以下是滾動動畫
  //   var sectionTitle = this.title;
  //   console.log(sectionTitle);
  //   var sectionId = "#section--" + sectionTitle;
  //   console.log(sectionId);
  //   var scrollPoint = $(sectionId).offset().top;
  //   var lastScrollPoint = scrollPoint - 100;
  //   $("html,body").animate({ scrollTop: lastScrollPoint }, 800);
  // })
});