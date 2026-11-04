#!/bin/sh
# রিপোর নতুন ফাইল আপলোড ও কমিট করার পরে চালান (রিপোর রুট ফোল্ডারে)।
# চালানোর আগে zip ও ছবির একটা কপি নিজের কম্পিউটারে রেখে দিন।
git rm -- "mostafa-auvi-website-main.zip" \
          "mostafa-auvi-website-main post tabil.zip" \
          "mostafa-auvi-website-upgraded.zip" \
          "workspace-9e7289da-c63e-47bc-9bba-f2b3bca121d2 (1)" \
          "author-bio.jpg.jpg" \
          "কবির ছবি.jpg" \
          "book1.jpg" "book2.jpg"
git commit -m "Remove old archives, duplicates and unused files"
git push
