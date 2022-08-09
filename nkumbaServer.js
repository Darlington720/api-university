const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const socketio = require("socket.io");
const jwt = require("jsonwebtoken");
const knex = require("knex");
const cors = require("cors");
const { cookie } = require("express/lib/response");
const req = require("express/lib/request");

const upload = multer();
const app = express();
const baseIp = "10.7.8.46";
const secret = "mySecret";
const port = 9000;

//Each member should have a name, room, user_id, status_if_logged_in
let members = [];

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(upload.any());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

const database = knex({
  client: "mysql",
  connection: {
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "nkumba",
  },
});

const data = [
  "students",
  "students_signin_book",
  "visitors",
  "non_teaching_staff",
  "stu_signin",
  "constraints",
  "course_units",
  "users",
];

data.map((item) =>
  app.get(`/${item}`, (req, res) => {
    database
      // .orderBy("id")
      .select("*")
      .from(item)
      .then((data) => {
        res.send(data);
      });
  })
);

// app.post("/api/auth", (req, res) => {
//   const { username, email, password } = req.body;
//   console.log(username, password);
//   database
//     .select("*")
//     .where({
//       email: username,
//       password: password,
//     })
//     .from("users")
//     .then((user) => {
//       console.log(user[0]);
//       const token = jwt.sign(
//         {
//           id: user[0].id,
//           email: user[0].email,
//           name: user[0].username,
//           address: user[0].address,
//           fullName: user[0].fullname,
//           image: user[0].image,
//         },
//         secret
//       );
//       return res.json(token);
//     })
//     .catch((err) => {
//       return res.status(400).json({ error: "Invalid email or password" });
//     });
// });

app.get("/getFees", (req, res) => {
  database
    // .orderBy("id")
    .select("*")
    .from("fees_structure")
    .join(
      "nationality",
      "fees_structure.nationality_id",
      "=",
      "nationality.nationality_id"
    )
    .join("sessions", "fees_structure.session_id", "=", "sessions.session_id")
    .join("schools", "fees_structure.school_id", "=", "schools.school_id")
    .join("levels", "fees_structure.levels_id", "=", "levels.level_id")
    .then((data) => {
      res.send(data);
    });
});

app.post("/addAllMyCourseUnits", (req, res) => {
  const { stu_no, course_id } = req.body;
  let status = false;
  // console.log(req.body);
  database
    // .orderBy("id")
    .select("*")
    .from("stu_selected_course_units")
    .join(
      "course_units",
      "stu_selected_course_units.course_id",
      "=",
      "course_units.course_id"
    )
    .where(function () {
      this.where("stu_id", "=", stu_no);
    })
    .then((data) => {
      data.forEach((item) => {
        if (item.course_id == course_id) {
          res.send(
            `${item.course_name} already added, Please Choose another one`
          );
          status = true;
        }
      });
      if (status == false) {
        if (data.length >= 8) {
          res.send("Maximum number of course units selected");
        } else {
          database("stu_selected_course_units")
            .insert({
              stu_id: stu_no,
              course_id: course_id,
            })
            .then((data) => {
              res.send("Course Unit added Successfully");
            })
            .catch((err) => res.send(err));
        }
      }
    });

  // res.send("Received the data");
});

app.post("/removeSelectedCourseUnit", (req, res) => {
  const { stu_id, course_id } = req.body;
  // console.log("data", req.body);
  database("stu_selected_course_units")
    .where("stu_id", stu_id)
    .andWhere("course_id", course_id)
    .del()
    .then((data) => {
      res.send("Course Unit deleted Successfully");
    });
});

app.post("/addConstraint", (req, res) => {
  const { name, percentage } = req.body;
  database("constraints")
    .insert({
      c_name: name,
      c_percentage: percentage,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

app.post("/updateConstraint/", (req, res) => {
  const { c_id, c_name, c_percentage } = req.body;
  console.log(req.body);

  database("constraints")
    .where(function () {
      this.where("c_id", "=", c_id);
    })
    .update({
      c_name: c_name,
      c_percentage: c_percentage,
    })
    .then((data) => {
      res.send("updated the data");
    })
    .catch((err) => res.send(err));
});

app.get("/mySelectedCourseUnits/:stu_no", (req, res) => {
  const { stu_no } = req.params;
  console.log("new", stu_no);
  database
    // .orderBy("id")
    .select("*")
    .from("stu_selected_course_units")
    .join(
      "course_units",
      "stu_selected_course_units.course_id",
      "=",
      "course_units.course_id"
    )
    .where(function () {
      this.where("stu_id", "=", stu_no);
    })
    .then((data) => {
      res.send(data);
    });
});

app.post("/myCourseUnitsToday/", (req, res) => {
  // const { lectures } = req.params;
  // let arr = lectures.split(",");
  // console.log(lectures.split(","));

  console.log(Array.isArray(req.body));
  console.log(req.body);
  console.log("from the client ", req.body.my_array);
  console.log("from the client ", req.body.day);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(d.getDay());
  let newArr = [];

  // arr.forEach((e) => {
  // console.log("lecture ", parseInt(e));
  // newArr.push(e);

  database
    .select("*")
    .from("timetable")
    // .join("lectures", "timetable.tt_id", "=", "lectures.tt_id")
    .where("day_id", "=", req.body.day)
    .join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    .join("lecturers", "timetable.lecturer_id", "=", "lecturers.lecturer_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    .leftJoin("lectures", "timetable.tt_id", "lectures.l_tt_id")
    // .where("date", "=", req.body.date)
    .orderBy("start_time")
    .then((data) => {
      // newArr.push(data);
      // console.log(data);
      data.forEach((item) => {
        req.body.my_array.forEach((reqItem) => {
          if (item.c_unit_id == reqItem) {
            newArr.push(item);
            // console.log(item.c_unit_id, reqItem);
          } else {
            // console.log("else " + item.c_unit_id, reqItem);
          }
        });
      });
      console.log(newArr);
      res.send(newArr);

      let arr = [];
      // console.log("New array1", newArr);
      // database
      //   .select("*")
      //   .from("lectures")
      //   .then((data2) => {
      //     if (data2.length > 0) {
      //       newArr.forEach((item) => {
      //         // arr.push(item);

      //         // arr.push(item);
      //         // console.log(data2);
      //         data2.forEach((lecture) => {
      //           if (lecture.tt_id == item.tt_id) {
      //             // console.log({ ...lecture, ...item });
      //             arr.push({ ...lecture, ...item });
      //             // arr.push({ ...item, ...lecture });
      //           } else {
      //             // console.log(item);
      //             arr.push(item);
      //             // arr.push(item);
      //           }
      //         });
      //       });
      //       console.log("New array2", arr);
      //       res.send(arr);
      //     } else {
      //       console.log("New array2", newArr);
      //       res.send(newArr);
      //     }
      //   });
      // });
    });

  // res.send(newArr);
});

app.post("/lecturerCourseunits/", (req, res) => {
  // const { lectures } = req.params;
  // let arr = lectures.split(",");
  // console.log(lectures.split(","));

  const { lecturer_id, day, l_date } = req.body;
  // console.log(req.params);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(req.body);
  let newArr = [];

  // arr.forEach((e) => {
  // console.log("lecture ", parseInt(e));
  // newArr.push(e);

  database
    .select("*")
    .from("timetable")
    // .where("day_id", "=", date)

    // .where("c_unit_id", "=", 1)
    // .andWhere("lecturer_id", "=", 11)
    .where({
      day_id: day,
      // lecturer_id,
    })
    .join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    .join("lecturers", "timetable.lecturer_id", "=", "lecturers.lecturer_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    .leftJoin("lectures", "timetable.tt_id", "lectures.l_tt_id")
    .orderBy("start_time")

    .then((data) => {
      database
        .select("*")
        .from("lecturers")
        .where({
          // day_id: 1,
          lecturer_id,
        })
        .then((lecturer) => {
          data.forEach((lecture) => {
            if (lecturer[0].lecturer_id == lecture.lecturer_id) {
              newArr.push(lecture);
            }
          });
          // res.send(newArr)
          // console.log("REsult", newArr);
          res.send(newArr);
        });

      // });
    });

  // res.send(newArr);
});

app.post("/getCustomReports/", (req, res) => {
  const { date, requiredData } = req.body;
  console.log(req.body);
  if (requiredData && date) {
    if (requiredData == "students") {
      database
        .select("*")
        .from("students")

        .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")
        .join("users", "student_signin.signed_in_by", "=", "users.id")
        // .where("students.stu_id", "=", studentNo)
        .andWhere("student_signin.signin_date", "=", date)
        .orderBy("signin_time")
        .then((data) => {
          data.map((item) => {
            const d2 = new Date(item.signin_date);
            const date2 = ` ${d2.getFullYear()}-0${
              d2.getMonth() + 1
            }-${d2.getDate()}`;
            item.signin_date = date2;
          });
          res.send(data);
        });
    } else if (requiredData == "visitors") {
      database("users")
        .join(
          "visitors",
          "users.id",

          "=",
          "visitors.signed_in_by"
        )
        .where("visitors.date", "=", date)
        .orderBy("time")
        .select("*")
        .then((data) => {
          data.map((item) => {
            const d2 = new Date(item.date);
            const date2 = ` ${d2.getFullYear()}-0${
              d2.getMonth() + 1
            }-${d2.getDate()}`;
            item.date = date2;
          });
          res.send(data);
        });
    }
  }
});

app.get("/studentsToday", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    // .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-0${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(data);
    });
});

app.get("/visitorData", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("users")
    .join(
      "visitors",
      "users.id",

      "=",
      "visitors.signed_in_by"
    )
    .where("visitors.date", "=", date)
    .orderBy("time")
    .select("*")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.date);
        const date2 = ` ${d2.getFullYear()}-0${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.date = date2;
      });
      res.send(data);
    });
});

app.get("/myVisitors/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("visitors")
    .join(
      "users",
      "visitors.signed_in_by",

      "=",
      "users.id"
    )
    .where("visitors.date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/myStudents/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("student_signin")
    // .join(
    //   "users",
    //   "students_signin_book.signed_in_by",

    //   "=",
    //   "users.id"
    // )
    // .where("student_signin.signin_date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      signin_date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/studentData", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("students")
    .join(
      "students_signin_book",
      "students.stu_id",

      "=",
      "students_signin_book.stu_id"
    )

    .join(
      "students_signout_book",
      "students_signin_book.signin_date",
      "=",
      "students_signout_book.signin_date"
    )
    .where("students_signin_book.signin_date", "=", date)

    .select("*")
    .then((data) => {
      res.send(data);
    });
});

// app.get("/student/:studentNo", (req, res) => {
//   const { studentNo } = req.params;
//   console.log(studentNo);
//   const d = new Date();
//   const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

//   database
//     .select("*")
//     .from("students_signin_book")
//     .where({
//       stu_id: studentNo,
//       signin_date: date,
//     })
//     .then((data) => {
//       // res.send(data);
//       if (data.length > 0) {
//         database
//           .select("*")
//           .from("students")

//           .join(
//             "students_signin_book",
//             "students.stu_id",
//             "=",
//             "students_signin_book.stu_id"
//           )

//           .join(
//             "students_signout_book",
//             "students.stu_id",
//             "=",
//             "students_signout_book.stu_id"
//           )
//           .where("students.stu_id", "=", studentNo)
//           .andWhere("students_signout_book.signin_date", "=", date)
//           .then((data3) => {
//             // res.send(data3);
//             if (data3[0].sign_out !== null) {
//               res.send("Already registered");
//             } else {
//               res.send([
//                 data3[0],
//                 {
//                   todaysStatus: true,
//                   imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
//                 },
//               ]);
//             }
//           });
//       } else {
//         database
//           .select("*")
//           .from("students")
//           .where({
//             stu_id: studentNo,
//           })
//           .then((data2) => {
//             res.send([
//               ...data2,
//               {
//                 todaysStatus: false,
//                 imageUrl: data2[0]
//                   ? `http://${baseIp}:${port}/assets/${data2[0].image}`
//                   : "http://${baseIp}:${port}/assets/jacket.jpg",
//               },
//             ]);
//           });
//       }
//     });

//   // database("students")
//   //   .join(
//   //     "students_signin_book",
//   //     "students.stu_id",
//   //     "=",
//   //     "students_signin_book.stu_id"
//   //   )
//   //   .select("*")
//   //   // .where("quantity", ">", 0)

//   //   .then((data) => {
//   //     res.send(data);
//   //   });
// });

app.post("/allstudentdetails/", (req, res) => {
  const { studentNo, date } = req.body;
  console.log(req.body);
  const userId = 1;
  console.log(studentNo);
  // const d = new Date();
  // const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // let modifiedData = [];
  // let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)
        .then((data3) => {
          res.send([
            ...data3,
            {
              imageUrl: data3[0]
                ? `http://${baseIp}:${port}/assets/${data3[0].image}`
                : "http://${baseIp}:${port}/assets/jacket.jpg",
            },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});
app.get("/allstudentdetails/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  console.log(studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  let modifiedData = [];
  let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)
        .then((data3) => {
          res.send([
            ...data3,
            {
              imageUrl: data3[0]
                ? `http://${baseIp}:${port}/assets/${data3[0].image}`
                : "http://${baseIp}:${port}/assets/jacket.jpg",
            },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});
app.get("/student/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  console.log("number", studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")

        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)

        .then((data3) => {
          if (data3.length > 0) {
            // res.send(data);
            if (data3[data3.length - 1].signout_time !== null) {
              // res.send("Already registered");
              database
                .select("*")
                .from("students")
                // .join("finance", "students.stu_id", "=", "finance.stu_no")
                .where({
                  stu_id: studentNo,
                })
                .then((data2) => {
                  database
                    .select("*")
                    .from("constraints")
                    .then((data6) => {
                      res.send([
                        ...data2,
                        {
                          todaysStatus: "not new",
                          imageUrl: data2[0]
                            ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                            : "http://${baseIp}:${port}/assets/jacket.jpg",
                          requiredPercentage: data6[0].c_percentage,
                        },
                      ]);
                    });
                });
            } else {
              database
                .select("*")
                .from("constraints")
                .then((data6) => {
                  res.send([
                    data3[data3.length - 1],
                    {
                      todaysStatus: true,
                      imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
                      requiredPercentage: data6[0].c_percentage,
                    },
                  ]);
                });
            }
          } else {
            database
              .select("*")
              .from("students")
              // .join("finance", "students.stu_id", "=", "finance.stu_no")
              .where({
                stu_id: studentNo,
              })
              .then((data2) => {
                if (data2[0]) {
                  database
                    // .orderBy("id")
                    .select("*")
                    .from("fees_structure")
                    .join(
                      "nationality",
                      "fees_structure.nationality_id",
                      "=",
                      "nationality.nationality_id"
                    )
                    .join(
                      "sessions",
                      "fees_structure.session_id",
                      "=",
                      "sessions.session_id"
                    )
                    .join(
                      "schools",
                      "fees_structure.school_id",
                      "=",
                      "schools.school_id"
                    )
                    .join(
                      "levels",
                      "fees_structure.levels_id",
                      "=",
                      "levels.level_id"
                    )
                    .where("sessions.session_name", "=", data2[0].study_time)
                    // .andWhere("schools.school_id", "=", data2[0].school_id)
                    .andWhere(
                      "nationality.nationality_id",
                      "=",
                      data2[0].nationality_id
                    )
                    .andWhere("levels.levels", "=", data2[0].level)
                    .then((data4) => {
                      database
                        .select("*")
                        .from("finance")
                        .where("finance.stu_no", "=", studentNo)
                        .then((data5) => {
                          database
                            .select("*")
                            .from("constraints")
                            .then((data6) => {
                              res.send([
                                ...data2,
                                {
                                  todaysStatus: false,
                                  imageUrl: data2[0]
                                    ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                                    : "http://${baseIp}:${port}/assets/jacket.jpg",
                                  feesStructure: data4,
                                  paid: data5,
                                  percentage:
                                    data2[0] && data5[0]
                                      ? (data5[0].amount / data4[0].tuition) *
                                        100
                                      : 0,
                                  requiredPercentage: data6[0].c_percentage,
                                  paidAmt: data5[0] ? data5[0].amount : 0,
                                  reachedPercentage:
                                    data2[0] && data5[0]
                                      ? (data5[0].amount / data4[0].tuition) *
                                          100 >=
                                        data6[0].c_percentage
                                      : 0 >= data6[0].c_percentage,
                                },
                              ]);
                            });
                        });
                    });
                } else {
                  database
                    .select("*")
                    .from("constraints")
                    .then((data6) => {
                      res.send([
                        {
                          todaysStatus: false,
                          imageUrl: data2[0]
                            ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                            : "http://${baseIp}:${port}/assets/jacket.jpg",
                          requiredPercentage: data6[0].c_percentage,
                        },
                      ]);
                    });
                }
              });
          }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.get("/lecture/:lecture_id", (req, res) => {
  const { lecture_id } = req.params;
  const userId = 1;
  console.log("number", lecture_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("timetable")

    // .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("timetable.tt_id", "=", lecture_id)
    // .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      res.send(data);
    });
});

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
  if (0 <= d && d < 10) return "0" + d.toString();
  if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
  return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function () {
  return (
    this.getUTCFullYear() +
    "-" +
    twoDigits(1 + this.getUTCMonth()) +
    "-" +
    twoDigits(this.getUTCDate()) +
    " " +
    twoDigits(this.getUTCHours()) +
    ":" +
    twoDigits(this.getUTCMinutes()) +
    ":" +
    twoDigits(this.getUTCSeconds())
  );
};

app.post("/gateReg", (req, res) => {
  const { gate_id, user_id } = req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  console.log(
    "time",
    d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  );

  database("assigned_gates")
    .insert({
      gate_id,
      user_id,
      date,
      time,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

// app.post("/studentReg", (req, res) => {
//   const { stu_id, temp, signed_in_by } = req.body;
//   console.log(req.body);
//   const d = new Date();
//   const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
//   const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
//   console.log(
//     "time",
//     d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
//   );

//   database("students_signin_book")
//     .insert({
//       stu_id: stu_id,
//       temperature: temp,
//       signin_date: date,
//       signin_time: time,
//       signed_in_by,
//     })
//     .then((data) => {
//       database("students_signout_book")
//         .insert({
//           stu_id: stu_id,
//           signin_date: date,
//         })
//         .then((data2) => {
//           res.send("Received the data");
//         });
//     })
//     .catch((err) => res.send(err));
// });

app.post("/studentReg", (req, res) => {
  const { stu_id, temp, signed_in_by, signed_in, signin_gate, studentBioData } =
    req.body;
  // console.log("reg data", req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  console.log(
    "time",
    d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  );

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", stu_id)
    .andWhere("student_signin.signin_date", "=", date)
    .then((data) => {
      if (data.length > 0) {
        database("stu_signin")
          .insert({
            stu_id: stu_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signined_in_by: signed_in,
            signin_gate,
          })
          .then((data) => {
            database("users")
              .where(function () {
                this.where("stu_no", "=", stu_id);
              })
              .update({
                stu_status: 1,
              })
              .then((data) => {
                // res.send("updated the data");
              })
              .catch(
                (err) => {}
                // res.send(err)
              );
            res.send("Received the data");
            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => res.send(err));
      } else {
        database("student_signin")
          .insert({
            stu_id: stu_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signed_in_by,
          })
          .then((data) => {
            database("stu_signin")
              .insert({
                stu_id: stu_id,
                temperature: temp,
                signin_date: date,
                signin_time: time,
                signined_in_by: signed_in,
                signin_gate,
              })
              .then((data) => {
                res.send("Received the data");

                database
                  .select("*")
                  .from("users")
                  .where("users.stu_no", "=", stu_id)
                  .then((data) => {
                    // res.send(data);
                    if (data.length == 0) {
                      database
                        .select("*")
                        .from("students")
                        .where("students.stu_id", "=", stu_id)
                        .then((students) => {
                          database("users")
                            .insert({
                              userfull_name: students[0].full_name,
                              username: stu_id,
                              password: stu_id,
                              email: `${students[0].full_name.replace(
                                /\s/g,
                                ""
                              )}@gmail.com`,
                              gendar: students[0].gendar,
                              phoneNo: stu_id,
                              DOB: null,
                              Address: null,
                              user_image: "jacket.jpg",
                              role: "Student",
                              stu_no: stu_id,
                              stu_status: 1,
                              is_class_rep: 0,
                            })
                            .then((data4) => {});
                        });
                    }
                  });

                // database("students_signout_book")
                //   .insert({
                //     stu_id: stu_id,
                //     signin_date: date,
                //   })
                //   .then((data2) => {
                //     res.send("Received the data");
                //   });
              })
              .catch((err) => res.send(err));

            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => res.send(err));
      }
    });

  database
    .select("*")
    .from("students_biodata")
    .where("students_biodata.stdno", "=", stu_id)
    .then((stuData) => {
      if (stuData.length == 0) {
        database("students_biodata")
          .insert({
            stdno: studentBioData.stdno,
            regno: studentBioData.regno,
            name: studentBioData.name,
            admissions_form_no: studentBioData.admissions_form_no,
            sex: studentBioData.sex,
            telno: studentBioData.telno,
            entry_ac_yr: studentBioData.entry_ac_yr,
            entry_study_yr: studentBioData.entry_study_yr,
            nationality: studentBioData.nationality,
            facultycode: studentBioData.facultycode,
            progtitle: studentBioData.progtitle,
            programlevel: studentBioData.programlevel,
            progduration: studentBioData.progduration,
            facultytitle: studentBioData.facultytitle,
            intake: studentBioData.intake,
            campus: studentBioData.campus,
            sponsorship: studentBioData.sponsorship,
            residence_status: studentBioData.residence_status,
            current_sem: studentBioData.current_sem,
            study_yr: studentBioData.study_yr,
          })
          .then((result) => {
            console.log("Added a new student to our db");
          });
      }
    });
});

app.post("/studentSignout/", (req, res) => {
  const { studentNo, signed_in_by, signed_out_by, signin_time, signout_gate } =
    req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

  database("stu_signin")
    // .where("stu_id", "=", studentNo)
    .where(function () {
      this.where("stu_id", "=", studentNo);
    })
    .andWhere(function () {
      this.where("signin_date", "=", date);
    })
    .andWhere(function () {
      this.where("signined_in_by", "=", signed_in_by);
    })
    .andWhere(function () {
      this.where("signin_time", "=", signin_time);
    })
    .select("*")
    .update({
      signed_out_by: signed_out_by,
      signout_time: time,
      signout_gate,
    })
    .then((data) => {
      database("users")
        .where(function () {
          this.where("stu_no", "=", studentNo);
        })
        .update({
          stu_status: 0,
        })
        .then((data) => {
          // res.send("updated the data");
        })
        .catch(
          (err) => {}
          // res.send(err)
        );
      res.send("received the data");
    });
});

//check out which students subscribed for a particular lecture
app.post("/checkStudentSubscription/", (req, res) => {
  const { course_id, stu_id } = req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_id,
      stu_id,
    })
    .then((data) => {
      database("lecture_members")
        .where(function () {
          this.where("member_id", "=", stu_id);
        })
        .andWhere("lecture_id", course_id)
        .then((data8) => {
          res.send([...data, data8]);
        });
    });
});

//get the data about lectures that already started
app.post("/getLectureData/", (req, res) => {
  const { course_id, tt_id, day_id, selectedDate } = req.body;
  console.log(req.body);
  const d = new Date(selectedDate);
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log("Loooking for date", date);

  database("lectures")
    // .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_unit_id: course_id,
      l_tt_id: tt_id,
      l_day_id: day_id,
      date,
    })
    .then((data) => {
      database("lecture_members")
        .join("users", "lecture_members.member_id", "=", "users.stu_no")
        .select("*")

        .where({
          lecture_id: course_id,
          day_id,
          date,
        })
        .then((data8) => {
          res.send([...data, data8]);
        });
    });
});

app.get("/getEnrolledStudents/:course_id", (req, res) => {
  const { course_id } = req.params;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("stu_selected_course_units")
    .join("users", "stu_selected_course_units.stu_id", "=", "users.stu_no")
    .select("*")

    .where({
      course_id,
    })
    .then((data) => {
      res.send(data);
    });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  database
    .select("*")
    .where({
      username: username,
      password: password,
    })
    .from("users")
    .then((user) => {
      console.log(user);
      if (!user[0]) {
        return res.status(400).json({ error: "Invalid email or password " });
      } else {
        if (user[0].role == "Student") {
          database
            // .orderBy("id")
            .select("*")
            .from("students")
            .where(function () {
              this.where("stu_id", "=", user[0].stu_no);
            })
            .then((studentData) => {
              database
                // .orderBy("id")
                .select("*")
                .from("stu_selected_course_units")
                .join(
                  "course_units",
                  "stu_selected_course_units.course_id",
                  "=",
                  "course_units.course_id"
                )
                .where(function () {
                  this.where("stu_id", "=", user[0].stu_no);
                })
                .then((courseUnitsData) => {
                  return res.send({
                    ...user[0],
                    otherData: studentData,
                    imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
                    studentCourseUnits: courseUnitsData,
                  });
                });
            });
        } else {
          return res.send({
            ...user[0],
            imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
          });
        }
      }
      // const token = jwt.sign(
      //   {
      //     id: user[0].id,
      //     email: user[0].email,
      //     name: user[0].username,
      //     address: user[0].address,
      //     fullName: user[0].fullname,
      //     image: user[0].image,
      //   },
      //   secret
      // );
    })
    .catch((err) => {
      return res.status(400).json({ error: "Invalid email or password" });
    });
});

app.post("/api/addVisitor", (req, res) => {
  const { full_name, reason, office, signed_in_by, signin_gate } = req.body;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(req.body);
  database("visitors")
    .insert({
      v_full_name: full_name,
      reason,
      office,
      signed_in_by,
      date,
      signin_gate,
    })
    .then((data) => res.status(200).send("Received the data"))
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

const expressServer = app.listen(port, baseIp, () =>
  console.log(`App is running on port ${port}`)
);

const io = socketio(expressServer);

io.on("connection", async (socket) => {
  // console.log(`[${socket.id}] socket connected`);

  // io.emit("welcome", "Welcome to the socket io server");

  // const clients = await io.in("9").allSockets();
  // console.log("Clients", clients);

  socket.on("thanks", (msg) => {
    console.log(msg);
  });

  socket.on("addStudentToClass", (data) => {
    const d = new Date();
    const date =
      d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + data.selectedDate;
    // console.log(`Adding ${data.stu_no} to class ${data.course_id}`);

    database("users")
      .where(function () {
        this.where("stu_no", "=", data.stu_no);
      })

      .then((data2) => {
        const normalStudent = addUser(
          data2[0].stu_no,
          data2[0].userfull_name,
          `${data.course_id}`,
          "true",
          data2[0].role,
          `${data2[0].is_class_rep}`,
          new Date().toLocaleTimeString()
        );

        //check in the databse to see if the student is already there
        database("lecture_members")
          .where(function () {
            this.where("member_id", "=", data.stu_no);
          })
          // .andWhere("course_id", course_id)
          .andWhere("lecture_id", data.course_id)
          .then((data10) => {
            console.log("Member in database", data10);
            if (data10.length == 0) {
              //user is not there, so we a adding the student
              addMember(
                data2[0].stu_no,
                data.day_id,
                date,
                data.course_id,
                1,
                0,
                new Date().toLocaleTimeString()
              );
            }
          });
        // console.log(normalStudent);
        // console.log(
        //   `Adding ${data.stu_no} to class ${data.course_id} in database block`
        // );
        // console.log(members);

        const indexOfObject = members.findIndex((object) => {
          return object.id === `${data.stu_no}`;
        });
        // members.splice(indexOfObject, 1);

        console.log("indexOfObject", indexOfObject);
        if (indexOfObject !== -1) {
          //student already in the list
          // members.splice(indexOfObject, 1)
          console.log(
            "student already in the list, am just updating the status"
          );
          io.in(`${data.course_id}`).emit(
            "studentAlreadyInClass",
            "student already in class"
          );

          members[indexOfObject].status = "true";

          const membersInRoom = getMembersInRoom(data.course_id);

          console.log("Memebers in the room 555555", membersInRoom);

          io.in(`${data.course_id}`).emit("updatedMembersList", membersInRoom);
          io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
        } else {
          //student not in the list
          members.push(normalStudent);
          console.log("student not in the list, am dding him there");
          const membersInRoom = getMembersInRoom(data.course_id);

          console.log("Memebers in the room 89787787", membersInRoom);

          io.in(`${data.course_id}`).emit("updatedMembersList", membersInRoom);

          io.in(`${data.course_id}`).emit("addStudentToClassFromServer", data);
        }
      })

      .catch(
        (err) => {}
        // res.send(err)
      );
  });

  socket.on("joinRoom", (roomToJoin) => {
    const user2 = socket.handshake.query;
    console.log("user query", user2);
    let user;
    // console.log("handshake", socket.handshake.query);
    console.log("Socket data", roomToJoin);
    database("lecture_members")
      .where(function () {
        this.where("member_id", "=", socket.handshake.query.user_id);
      })
      .then((data10) => {
        console.log("Member in database", data10);
        if (data10.length == 0) {
          //user is not there, so we a adding the student
          user = addUser(
            socket.handshake.query.user_id,
            socket.handshake.query.name,
            roomToJoin,
            "false",
            socket.handshake.query.role,
            socket.handshake.query.isClassRep,
            new Date().toLocaleTimeString()
          );
        } else {
          user = addUser(
            socket.handshake.query.user_id,
            socket.handshake.query.name,
            roomToJoin,
            "true",
            socket.handshake.query.role,
            socket.handshake.query.isClassRep,
            new Date().toLocaleTimeString()
          );
        }
        console.log("User ", user);

        const indexOfObject = members.findIndex((object) => {
          return object.id === socket.handshake.query.user_id;
        });

        if (indexOfObject !== -1) members.splice(indexOfObject, 1);
        const roomToLeave = [...socket.rooms][1];
        if (roomToLeave) {
          socket.leave(roomToLeave);
        }

        console.log("Joining room");
        socket.join(roomToJoin);
        console.log([...socket.rooms]);

        members.push(user);
        checkMembers("/", roomToJoin);
        console.log("members so far", members);
      });

    // members.splice(indexOfObject, 1);
  });

  socket.on("joinRoomStudent", (roomToJoin) => {
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    console.log("Joining room");
    socket.join(roomToJoin);
    console.log([...socket.rooms]);
  });

  socket.on("updateStudentStatusToServer", (data) => {
    console.log("REceiving updates");
    console.log(data);

    database("users")
      .where(function () {
        this.where("stu_no", "=", data.stu_no);
      })
      .update({
        stu_status: data.status ? 1 : 0,
      })
      .then((data) => {
        // res.send("updated the data");
      })
      .catch(
        (err) => {}
        // res.send(err)
      );
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    socket.join(data.stu_no);
    const room = [...socket.rooms][1];
    console.log("rooms", room);
    io.in(`${room}`).emit("updateStudentStatus", data);
    // io.emit("updateStudentStatus", data);
  });

  socket.on("lectureHasStarted", (data) => {
    const d = new Date();
    const date =
      d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + data.selectedDate;
    console.log("lectureHasStarted", data);
    //update lecture status in database
    // database("timetable")
    //   .where(function () {
    //     this.where("tt_id", "=", data.timetable_id);
    //   })
    //   .update({
    //     lecture_status: data.started ? 1 : 0,
    //   })
    //   .then(() => {
    //     console.log("Status updated successfully to 1");
    //   });

    //insert the new started lecture in the lectures table

    database
      .select("*")
      .from("timetable")
      .where("timetable.tt_id", "=", data.timetable_id)
      .then((data2) => {
        // res.send(data);
        database("lectures")
          .where(function () {
            this.where("l_tt_id", "=", data.timetable_id);
          })
          .then((data5) => {
            if (data5.length == 0) {
              database("lectures")
                .insert({
                  l_tt_id: data.timetable_id,
                  l_day_id: data.day_id,
                  course_unit_id: data2[0].c_unit_id,
                  date: date,
                  has_started: data.started,
                  started_at: new Date().toLocaleTimeString(),
                })
                .then((data) => {
                  // res.send("lecture added Successfully");
                  console.log("lecture added Successfully");
                })
                .catch((err) => console.log("error in adding lecture", err));
            }
          });

        const roomToLeave = [...socket.rooms][1];
        if (roomToLeave) {
          socket.leave(roomToLeave);
        }
        console.log(data2[0].c_unit_id);
        socket.join(`${data2[0].c_unit_id}`);

        const room = [...socket.rooms][1];
        io.in(`${room}`).emit("lectureHasStartedFromServer", {
          course_id: data2[0].c_unit_id,
          started: true,
        });

        members.forEach((member) => {
          if (member.room == `${data2[0].c_unit_id}`) {
            if (member.role == "Lecturer") {
              member.status = "true";
              //inserting the lecturer in the lecture members table
              database("lecture_members")
                .where(function () {
                  this.where("member_id", "=", member.id);
                })
                .andWhere("lecture_id", member.room)
                .then((data10) => {
                  console.log("Member in database", data10);
                  if (data10.length == 0) {
                    //user is not there, so we a adding the student
                    addMember(
                      member.id,
                      data.day_id,

                      date,
                      data2[0].c_unit_id,
                      1,
                      0,
                      new Date().toLocaleTimeString()
                    );
                  }
                });
            } else if (member.is_class_rep == "1") {
              member.status = "true";

              database("lecture_members")
                .where(function () {
                  this.where("member_id", "=", member.id);
                })
                .andWhere("lecture_id", member.room)
                .then((data10) => {
                  console.log("Member in database", data10);
                  if (data10.length == 0) {
                    //user is not there, so we a adding the student
                    addMember(
                      member.id,
                      data.day_id,

                      date,
                      data2[0].c_unit_id,
                      1,
                      1,
                      new Date().toLocaleTimeString()
                    );
                  }
                });
            }
          }
        });

        const membersInRoom = getMembersInRoom(data2[0].c_unit_id);

        console.log("Memebers in the room ", membersInRoom);

        io.in(`${room}`).emit("updatedMembersList", membersInRoom);

        console.log("rooms", socket.rooms);
        let customList = [];
        // members.forEach((member) => {
        //   if (member.room == `${data2[0].c_unit_id}`) {
        //     customList.push(member);
        //   }
        // });

        // io.in(`${room}`).emit("updatedMembersList", {
        //   members: customList,
        //   count: members.length,
        // });

        console.log("Updated Members", members);
        checkMembers("/", room);

        // database
        //   .select("*")
        //   .from("stu_selected_course_units")
        //   .where("stu_selected_course_units.course_id", "=", 9)
        //   .then((data3) => {
        //     console.log("students enrolled in the unit", data3);
        //     data3.forEach((student) => {
        //       socket.join(student.stu_id);
        //     });
        //   });
      });
  });

  // const roomTitle = [...socket.rooms];
  // console.log("rooms", roomTitle);

  // io.of("/")
  //       .to(roomToJoin)
  //       .emit("chatMessageToClients", fullMsg);
});

// io.of("/students").on("connection", (nsSocket) => {
//   console.log(`${nsSocket.id} has joined students namespace`);
// });

const getMembersInRoom = (room) => {
  let customList = [];
  members.forEach((member) => {
    if (member.room == `${room}` && member.status == "true") {
      customList.push(member);
    }
  });
  return customList;
};

const checkMembers = async (namespace, roomToJoin) => {
  const clients = await io.of(namespace.endpoint).in(roomToJoin).allSockets();
  console.log("Clients connected", clients);
  // io.of(namespace.endpoint)
  //   .to(roomToJoin)
  //   .emit("currNumOfClients", clients.size);
};

const addMember = (
  member_id,
  day_id,
  date,
  lecture_id,
  status,
  is_class_rep,
  joinedAt
) => {
  database("lecture_members")
    .insert({
      member_id,
      day_id,
      date,
      lecture_id,
      status,
      is_class_rep,
      joined_at: joinedAt,
    })
    .then((data8) => {
      console.log("Member added sucessfully");
    });
};

const addUser = (id, name, room, status, role, isClassRep, joinedAt) => {
  const user = {
    id,
    stu_no: id,
    userfull_name: name,
    room,
    status,
    role,
    is_class_rep: isClassRep,
    joined_at: joinedAt,
  };

  return user;
};
